import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const BASE = Constants.expoConfig?.extra?.apiUrl
  || process.env.EXPO_PUBLIC_API_URL
  || 'http://localhost:3000';

let _token        = null;
let _refreshToken = null;
let _refreshing   = false;       // verrou pour éviter les rafales de refresh
let _refreshQueue = [];          // requêtes en attente pendant le refresh

export function setToken(t)        { _token = t; }
export function getToken()         { return _token; }
export function setRefreshToken(t) { _refreshToken = t; }
export function getBase()          { return BASE.replace(/\/$/, ''); }

// ── Coeur HTTP ──────────────────────────────────────────────────────────────────
async function doRequest(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (_token) headers['Authorization'] = 'Bearer ' + _token;

  const res = await fetch(BASE.replace(/\/$/, '') + path, {
    method,
    headers,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(
    new Error(data.message || data.error || `Erreur ${res.status}`),
    { status: res.status, data }
  );
  return data;
}

// ── Refresh automatique sur 401 ────────────────────────────────────────────────────
async function tryRefresh() {
  if (!_refreshToken) throw new Error('no_refresh_token');

  const res  = await fetch(BASE.replace(/\/$/, '') + '/api/auth/refresh', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ refreshToken: _refreshToken }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error('refresh_failed');

  _token        = data.accessToken;
  _refreshToken = data.refreshToken;
  await SecureStore.setItemAsync('jwt_token',     data.accessToken);
  await SecureStore.setItemAsync('refresh_token', data.refreshToken);
  return data.accessToken;
}

async function request(method, path, body = null) {
  try {
    return await doRequest(method, path, body);
  } catch (err) {
    // Sur 401 : tenter un refresh une seule fois
    if (err.status !== 401 || !_refreshToken) throw err;

    if (_refreshing) {
      // Une autre requête est déjà en train de refresher — on attend
      return new Promise((resolve, reject) => {
        _refreshQueue.push({ resolve, reject, method, path, body });
      });
    }

    _refreshing = true;
    try {
      await tryRefresh();
      // Rejouer toutes les requêtes en attente
      _refreshQueue.forEach(q =>
        doRequest(q.method, q.path, q.body).then(q.resolve).catch(q.reject)
      );
      _refreshQueue = [];
      return await doRequest(method, path, body);
    } catch (_) {
      // Refresh impossible — déconnexion forcée
      _refreshQueue.forEach(q => q.reject(new Error('session_expired')));
      _refreshQueue = [];
      _token        = null;
      _refreshToken = null;
      await SecureStore.deleteItemAsync('jwt_token').catch(() => {});
      await SecureStore.deleteItemAsync('refresh_token').catch(() => {});
      throw Object.assign(new Error('session_expired'), { status: 401 });
    } finally {
      _refreshing = false;
    }
  }
}

export const api = {
  // Auth
  login:    (email, password)           => request('POST', '/api/auth/login',    { email, password }),
  register: (username, email, password) => request('POST', '/api/auth/register', { username, email, password }),
  logout:   ()                          => request('POST', '/api/auth/logout', { refreshToken: _refreshToken }),

  // Items
  getItems:   (page = 1, limit = 20) => request('GET', `/api/items?page=${page}&limit=${limit}`),
  getItem:    (id)                   => request('GET',   `/api/items/${id}`),
  createItem: (body)                 => request('POST',  '/api/items', body),
  updateItem: (id, body)             => request('PATCH', `/api/items/${id}`, body),
  deleteItem: (id)                   => request('DELETE', `/api/items/${id}`),

  // Photos
  uploadPhoto: async (itemId, asset) => {
    const formData = new FormData();
    const filename = asset.uri.split('/').pop();
    const match    = /\.(\w+)$/.exec(filename);
    const type     = match ? `image/${match[1]}` : 'image/jpeg';
    formData.append('photo', { uri: asset.uri, name: filename, type });
    const headers = {};
    if (_token) headers['Authorization'] = 'Bearer ' + _token;
    const res = await fetch(BASE.replace(/\/$/, '') + `/api/items/${itemId}/photos`,
      { method: 'POST', headers, body: formData });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.message || `Erreur ${res.status}`), { status: res.status, data });
    return data;
  },

  // Reference
  getCategories: () => request('GET', '/api/categories').then(r => r.categories ?? r),
  getLocations:  () => request('GET', '/api/locations').then(r => r.locations ?? r),

  // Search
  search: (q, filters = {}) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    Object.entries(filters).forEach(([k, v]) => v && p.set(k, v));
    return request('GET', `/api/search/items?${p.toString()}`);
  },

  // Claims
  createClaim: (itemId, requestMessage) => request('POST', '/api/claims', { itemId, requestMessage }),
  getMyClaims: ()                        => request('GET',  '/api/claims/my'),

  // Messages
  getConversations: ()                             => request('GET',  '/api/messages/conversations'),
  getThread:        (itemId, partnerId)            => request('GET',  `/api/messages/thread/${itemId}/${partnerId}`),
  sendMessage:      (recipientId, itemId, content) => request('POST', '/api/messages', { recipientId, itemId, content }),
  markRead:         (msgId)                        => request('PATCH', `/api/messages/${msgId}/read`),

  // User
  getMe: () => request('GET', '/api/users/me'),

  // Notifications
  getNotifications: () => request('GET', '/api/notifications'),
};

/**
 * SSE vers /api/notifications/stream.
 * Retourne cleanup().
 */
export function subscribeSSE(onMessage) {
  if (!_token) return () => {};

  const url = BASE.replace(/\/$/, '') + '/api/notifications/stream';
  let active = true;
  let reader  = null;

  (async () => {
    try {
      const res = await fetch(url, {
        headers: { Authorization: 'Bearer ' + _token, Accept: 'text/event-stream' },
      });
      reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (active) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop();
        for (const block of parts) {
          let eventName = 'message';
          let dataStr   = '';
          for (const line of block.split('\n')) {
            if (line.startsWith('event:')) eventName = line.slice(6).trim();
            if (line.startsWith('data:'))  dataStr   = line.slice(5).trim();
          }
          try { onMessage(eventName, JSON.parse(dataStr)); } catch (_) {}
        }
      }
    } catch (_) {}
  })();

  return () => {
    active = false;
    reader?.cancel().catch(() => {});
  };
}

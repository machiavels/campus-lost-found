import Constants from 'expo-constants';

// Récupère l'URL depuis .env (EXPO_PUBLIC_API_URL) ou extra dans app.json
const BASE = Constants.expoConfig?.extra?.apiUrl
  || process.env.EXPO_PUBLIC_API_URL
  || 'http://localhost:3000';

let _token = null;

export function setToken(t) { _token = t; }
export function getToken()  { return _token; }

async function request(method, path, body = null) {
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
    new Error(data.message || `Erreur ${res.status}`),
    { status: res.status, data }
  );
  return data;
}

export const api = {
  // Auth
  login:    (email, password)  => request('POST', '/api/auth/login',    { email, password }),
  register: (username, email, password) => request('POST', '/api/auth/register', { username, email, password }),
  logout:   ()                 => request('POST', '/api/auth/logout'),

  // Items
  getItems:  (page = 1, limit = 20) => request('GET', `/api/items?page=${page}&limit=${limit}`),
  getItem:   (id)              => request('GET',   `/api/items/${id}`),
  createItem:(body)            => request('POST',  '/api/items', body),
  updateItem:(id, body)        => request('PATCH',  `/api/items/${id}`, body),

  // Reference
  getCategories: ()            => request('GET', '/api/categories'),
  getLocations:  ()            => request('GET', '/api/locations'),

  // Search
  search:    (q, filters = {}) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    Object.entries(filters).forEach(([k, v]) => v && p.set(k, v));
    return request('GET', `/api/search/items?${p.toString()}`);
  },

  // Claims
  createClaim: (itemId, message) => request('POST', '/api/claims', { itemId, message }),

  // User
  getMe:     ()                => request('GET', '/api/users/me'),

  // Messages
  getConversations: ()         => request('GET', '/api/messages/conversations'),

  // Notifications
  getNotifications: ()         => request('GET', '/api/notifications?unread=true'),
};

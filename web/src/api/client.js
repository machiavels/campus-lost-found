import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let failedQueue = [];
const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => error ? prom.reject(error) : prom.resolve(token));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/refresh') &&
      !originalRequest.url.includes('/auth/login')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => failedQueue.push({ resolve, reject }))
          .then((token) => { originalRequest.headers.Authorization = `Bearer ${token}`; return api(originalRequest); })
          .catch((err) => Promise.reject(err));
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const { data } = await api.post('/auth/refresh');
        const newToken = data.accessToken ?? data.token;
        localStorage.setItem('accessToken', newToken);
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
  logout:   ()     => api.post('/auth/logout'),
  me:       ()     => api.get('/auth/me'),
  refresh:  ()     => api.post('/auth/refresh'),
};

// ── Items
export const itemsApi = {
  list:   (params)     => api.get('/items', { params }),
  get:    (id)         => api.get(`/items/${id}`),
  create: (form)       => api.post('/items', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data)   => api.put(`/items/${id}`, data),
  delete: (id)         => api.delete(`/items/${id}`),
};

// ── Search
export const searchApi = {
  items: (params) => api.get('/search', { params }),
};

// ── Messages
export const messagesApi = {
  list:      (params)   => api.get('/messages', { params }),
  getThread: (threadId) => api.get(`/messages/${threadId}`),
  send:      (data)     => api.post('/messages', data),
  markRead:  (threadId) => api.patch(`/messages/${threadId}/read`),
};

// ── Claims
export const claimsApi = {
  create:     (data) => api.post('/claims', data),
  getForItem: (itemId) => api.get(`/claims/item/${itemId}`),
  approve:    (id)   => api.patch(`/claims/${id}/approve`),
  reject:     (id)   => api.patch(`/claims/${id}/reject`),
};

// ── Notifications
export const notificationsApi = {
  list:     (params) => api.get('/notifications', { params }),
  markRead: (id)     => api.patch(`/notifications/${id}/read`),
  readAll:  ()       => api.patch('/notifications/read-all'),
};

// ── References
export const referenceApi = {
  categories: () => api.get('/categories'),
  locations:  () => api.get('/locations'),
};

// ── Admin
export const adminApi = {
  // Items (modération)
  pendingItems:  (params)           => api.get('/admin/items', { params }),
  moderateItem:  (id, action, reason) => api.patch(`/admin/items/${id}/moderate`, { action, reason }),
  verifyItem:    (id)               => api.patch(`/admin/items/${id}/verify`),
  rejectItem:    (id, reason)       => api.patch(`/admin/items/${id}/reject`, { reason }),
  // Users
  users:         (params)           => api.get('/admin/users', { params }),
  getUser:       (id)               => api.get(`/admin/users/${id}`),
  updateUser:    (id, data)         => api.put(`/admin/users/${id}`, data),
  setUserStatus: (id, status)       => api.patch(`/admin/users/${id}/status`, { status }),
  changeRole:    (id, role)         => api.patch(`/admin/users/${id}/role`, { role }),
  toggleUser:    (id)               => api.patch(`/admin/users/${id}/toggle`),
  // Catégories
  categories:        ()             => api.get('/admin/categories'),
  createCategory:    (data)         => api.post('/admin/categories', data),
  updateCategory:    (id, data)     => api.put(`/admin/categories/${id}`, data),
  deleteCategory:    (id)           => api.delete(`/admin/categories/${id}`),
  // Lieux
  locations:         ()             => api.get('/admin/locations'),
  createLocation:    (data)         => api.post('/admin/locations', data),
  updateLocation:    (id, data)     => api.put(`/admin/locations/${id}`, data),
  deleteLocation:    (id)           => api.delete(`/admin/locations/${id}`),
};

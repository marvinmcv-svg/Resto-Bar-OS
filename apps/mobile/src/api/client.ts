import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload?.tenantId) {
        config.headers['x-tenant-id'] = payload.tenantId;
      }
    } catch {
      // ignore malformed JWT
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE}/api/v1/auth/refresh`, { refreshToken });
          await SecureStore.setItemAsync('accessToken', res.data.accessToken);
          await SecureStore.setItemAsync('refreshToken', res.data.refreshToken);
          error.config.headers.Authorization = `Bearer ${res.data.accessToken}`;
          return apiClient(error.config);
        } catch {
          await SecureStore.deleteItemAsync('accessToken');
          await SecureStore.deleteItemAsync('refreshToken');
        }
      }
    }
    return Promise.reject(error);
  },
);

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),
  register: (data: { email: string; password: string; firstName: string; lastName: string; tenantName: string }) =>
    apiClient.post('/auth/register', data),
};

export const tablesApi = {
  getAll: () => apiClient.get('/floor/tables'),
};

export const menuApi = {
  getItems: (category?: string) =>
    apiClient.get('/menu', { params: category ? { category } : undefined }),
  getCategories: () => apiClient.get('/menu/categories'),
};

export const ordersApi = {
  create: (data: {
    tableId: string;
    serverId: string;
    guestId?: string;
    items: Array<{ menuItemId: string; quantity: number; seatNumber?: number; modifiers?: string[] }>;
  }) => apiClient.post('/orders', data),
  getAll: (status?: string) => apiClient.get('/orders', { params: { status } }),
  updateStatus: (id: string, status: string) => apiClient.patch(`/orders/${id}/status`, { status }),
};

export const kdsApi = {
  getActiveOrders: () => apiClient.get('/kds/expo'),
  getStationOrders: (station: string) => apiClient.get(`/kds/station/${station}`),
  bumpItem: (itemId: string) => apiClient.patch(`/kds/item/${itemId}/bump`),
  fireItem: (itemId: string) => apiClient.patch(`/kds/item/${itemId}/fire`),
};

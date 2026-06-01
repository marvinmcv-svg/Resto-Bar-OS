import { useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authApi } from '../api/client';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.login(email, password);
      await SecureStore.setItemAsync('accessToken', res.data.accessToken);
      await SecureStore.setItemAsync('refreshToken', res.data.refreshToken);
      setUser(res.data.user);
      return res.data.user as AuthUser;
    } catch (e: any) {
      const msg = e.response?.data?.message ?? 'Login failed';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    setUser(null);
  }, []);

  return { user, setUser, loading, error, login, logout };
}

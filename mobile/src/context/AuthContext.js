import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { setToken, setRefreshToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token,   setLocalToken] = useState(null);
  const [user,    setUser]       = useState(null);
  const [loading, setLoading]    = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored        = await SecureStore.getItemAsync('jwt_token');
        const storedRefresh = await SecureStore.getItemAsync('refresh_token');
        const storedUser    = await SecureStore.getItemAsync('user');
        if (stored) {
          setLocalToken(stored);
          setToken(stored);
          if (storedRefresh) setRefreshToken(storedRefresh);
          if (storedUser) setUser(JSON.parse(storedUser));
        }
      } catch (_) {}
      setLoading(false);
    })();
  }, []);

  async function signIn(t, rt, u) {
    setLocalToken(t);
    setToken(t);
    setRefreshToken(rt);
    setUser(u);
    await SecureStore.setItemAsync('jwt_token',     t);
    await SecureStore.setItemAsync('refresh_token', rt);
    await SecureStore.setItemAsync('user', JSON.stringify(u));
  }

  async function signOut() {
    setLocalToken(null);
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    await SecureStore.deleteItemAsync('jwt_token');
    await SecureStore.deleteItemAsync('refresh_token');
    await SecureStore.deleteItemAsync('user');
  }

  return (
    <AuthContext.Provider value={{ token, user, loading, signIn, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

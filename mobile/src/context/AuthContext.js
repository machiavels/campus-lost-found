import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { setToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setLocalToken] = useState(null);
  const [user,  setUser]       = useState(null);
  const [loading, setLoading]  = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync('jwt_token');
        const storedUser = await SecureStore.getItemAsync('user');
        if (stored) {
          setLocalToken(stored);
          setToken(stored);
          if (storedUser) setUser(JSON.parse(storedUser));
        }
      } catch (_) {}
      setLoading(false);
    })();
  }, []);

  async function signIn(t, u) {
    setLocalToken(t);
    setToken(t);
    setUser(u);
    await SecureStore.setItemAsync('jwt_token', t);
    await SecureStore.setItemAsync('user', JSON.stringify(u));
  }

  async function signOut() {
    setLocalToken(null);
    setToken(null);
    setUser(null);
    await SecureStore.deleteItemAsync('jwt_token');
    await SecureStore.deleteItemAsync('user');
  }

  return (
    <AuthContext.Provider value={{ token, user, loading, signIn, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

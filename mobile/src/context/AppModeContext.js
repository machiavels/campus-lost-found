import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AppModeContext = createContext(null);

export function AppModeProvider({ children }) {
  const [demoMode,  setDemoMode]  = useState(false);
  const [adminDemo, setAdminDemo] = useState(false);
  const [ready,     setReady]     = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const dm = await AsyncStorage.getItem('app_demo_mode');
        const ad = await AsyncStorage.getItem('app_admin_demo');
        if (dm === 'true') setDemoMode(true);
        if (ad === 'true') setAdminDemo(true);
      } catch (_) {}
      setReady(true);
    })();
  }, []);

  async function toggleDemo() {
    const next = !demoMode;
    setDemoMode(next);
    if (!next) setAdminDemo(false);
    await AsyncStorage.setItem('app_demo_mode', String(next));
    if (!next) await AsyncStorage.setItem('app_admin_demo', 'false');
  }

  async function toggleAdminDemo() {
    const next = !adminDemo;
    setAdminDemo(next);
    await AsyncStorage.setItem('app_admin_demo', String(next));
  }

  if (!ready) return null;

  return (
    <AppModeContext.Provider value={{ demoMode, adminDemo, toggleDemo, toggleAdminDemo }}>
      {children}
    </AppModeContext.Provider>
  );
}

export const useAppMode = () => useContext(AppModeContext);

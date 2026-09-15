import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppMode = 'demo' | 'live';

interface AppModeContextValue {
  appMode: AppMode;
  isLive: boolean;
  isDemo: boolean;
  setAppMode: (mode: AppMode) => Promise<void>;
  isLoaded: boolean;
}

const AppModeContext = createContext<AppModeContextValue>({
  appMode: 'demo',
  isLive: false,
  isDemo: true,
  setAppMode: async () => {},
  isLoaded: false,
});

const APP_MODE_KEY = '@stockspend/appMode';

export const AppModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appMode, setAppModeState] = useState<AppMode>('demo');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(APP_MODE_KEY)
      .then((stored) => {
        if (stored === 'live' || stored === 'demo') {
          setAppModeState(stored as AppMode);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoaded(true));
  }, []);

  const setAppMode = useCallback(async (mode: AppMode) => {
    setAppModeState(mode);
    try {
      await AsyncStorage.setItem(APP_MODE_KEY, mode);
    } catch {}
  }, []);

  return (
    <AppModeContext.Provider
      value={{
        appMode,
        isLive: appMode === 'live',
        isDemo: appMode === 'demo',
        setAppMode,
        isLoaded,
      }}
    >
      {children}
    </AppModeContext.Provider>
  );
};

export const useAppMode = () => useContext(AppModeContext);

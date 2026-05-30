import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {ThemeMode} from './aaaTheme';

type ThemeContextType = {
  isAAA: boolean;
  themeMode: ThemeMode;
  glassEnabled: boolean; // glass auto-disabled in AAA mode
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
  isAAA: false,
  themeMode: 'normal',
  glassEnabled: true,
  toggleTheme: () => {},
});

const THEME_STORAGE_KEY = '@nhai_theme_mode';

export function ThemeProvider({children}: {children: React.ReactNode}) {
  const [themeMode, setThemeMode] = useState<ThemeMode>('normal');

  // Restore persisted theme on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then(v => {
        if (v === 'aaa' || v === 'normal') {
          setThemeMode(v);
        }
      })
      .catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeMode(prev => {
      const next: ThemeMode = prev === 'aaa' ? 'normal' : 'aaa';
      AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const isAAA = themeMode === 'aaa';

  return (
    <ThemeContext.Provider
      value={{
        isAAA,
        themeMode,
        glassEnabled: !isAAA, // AAA mode disables glass for max contrast
        toggleTheme,
      }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return useContext(ThemeContext);
}

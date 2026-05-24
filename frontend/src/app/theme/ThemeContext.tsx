import React, {createContext, useContext, useState, useCallback} from 'react';
import type {ThemeMode} from './aaaTheme';

type ThemeContextType = {
  isAAA: boolean;
  themeMode: ThemeMode;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
  isAAA: false,
  themeMode: 'normal',
  toggleTheme: () => {},
});

export function ThemeProvider({children}: {children: React.ReactNode}) {
  const [themeMode, setThemeMode] = useState<ThemeMode>('normal');

  const toggleTheme = useCallback(() => {
    setThemeMode(prev => (prev === 'aaa' ? 'normal' : 'aaa'));
  }, []);

  return (
    <ThemeContext.Provider
      value={{isAAA: themeMode === 'aaa', themeMode, toggleTheme}}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return useContext(ThemeContext);
}

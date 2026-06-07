import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {
  darkTheme,
  lightTheme,
  radius,
  spacing,
  typography,
  type Theme,
  type ThemeName,
} from '@unicampus/ui';

export type ThemePref = 'system' | 'light' | 'dark';
const THEME_KEY = 'uc_theme_pref';

interface ThemeContextValue {
  theme: Theme;
  name: ThemeName;
  pref: ThemePref;
  setPref: (pref: ThemePref) => void;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  ready: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [pref, setPrefState] = useState<ThemePref>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void SecureStore.getItemAsync(THEME_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setPrefState(stored);
      }
      setReady(true);
    });
  }, []);

  const setPref = useCallback((next: ThemePref) => {
    setPrefState(next);
    void SecureStore.setItemAsync(THEME_KEY, next);
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const name: ThemeName = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
    return {
      theme: name === 'dark' ? darkTheme : lightTheme,
      name,
      pref,
      setPref,
      spacing,
      radius,
      typography,
      ready,
    };
  }, [pref, system, setPref, ready]);

  if (!ready) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

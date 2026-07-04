import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { appStorage } from './storage.js';
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

function getForcedWebTheme(): ThemePref | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  if (params.get('demo') === '1') return 'light';

  const urlTheme = params.get('theme');
  return urlTheme === 'light' || urlTheme === 'dark' ? urlTheme : null;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [forcedWebTheme] = useState<ThemePref | null>(getForcedWebTheme);
  const [pref, setPrefState] = useState<ThemePref>(() => forcedWebTheme ?? 'system');
  const [ready, setReady] = useState(() => forcedWebTheme != null);

  useEffect(() => {
    if (forcedWebTheme) {
      setReady(true);
      return;
    }

    void appStorage.getItemAsync(THEME_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setPrefState(stored);
      }
      setReady(true);
    });
  }, [forcedWebTheme]);

  const setPref = useCallback((next: ThemePref) => {
    if (forcedWebTheme) return;
    setPrefState(next);
    void appStorage.setItemAsync(THEME_KEY, next);
  }, [forcedWebTheme]);

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

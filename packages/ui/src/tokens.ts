// Design token'ları — tek doğruluk kaynağı (docs/12-design-system.md).
// NativeWind (mobil) ve Tailwind (admin) config'leri bu dosyadan türetilir.

export const palette = {
  primary: '#5B4FE8',
  primaryDark: '#4338CA',
  accent: '#F59E0B',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
} as const;

export interface Theme {
  primary: string;
  primaryDark: string;
  accent: string;
  success: string;
  danger: string;
  warning: string;
  info: string;
  bg: string;
  surface: string;
  surface2: string;
  surface3: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  onPrimary: string;
  overlay: string;
  shadow: string;
}

export type ThemeName = 'light' | 'dark';

export const lightTheme: Theme = {
  primary: palette.primary,
  primaryDark: palette.primaryDark,
  accent: palette.accent,
  success: palette.success,
  danger: palette.danger,
  warning: palette.warning,
  info: palette.info,
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  surface2: '#F8F9FA',
  surface3: '#F1F2F4',
  border: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#374151',
  textMuted: '#6B7280',
  textInverse: '#FFFFFF',
  onPrimary: '#FFFFFF',
  overlay: 'rgba(17,24,39,0.45)',
  shadow: '#000000',
};

export const darkTheme: Theme = {
  primary: '#7C72F0',
  primaryDark: palette.primary,
  accent: palette.accent,
  success: palette.success,
  danger: palette.danger,
  warning: palette.warning,
  info: palette.info,
  bg: '#0B0B0F',
  surface: '#121217',
  surface2: '#1A1A22',
  surface3: '#23232E',
  border: '#2D2D38',
  textPrimary: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textMuted: '#9CA3AF',
  textInverse: '#0B0B0F',
  onPrimary: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.6)',
  shadow: '#000000',
};

export const spacing = [4, 8, 12, 16, 24, 32, 48, 64] as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const typography = {
  headingXl: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  headingLg: { fontSize: 22, lineHeight: 28, fontWeight: '600' },
  headingMd: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  micro: { fontSize: 11, lineHeight: 16, fontWeight: '500' },
} as const;

export const elevation = {
  1: { shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  2: { shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  3: { shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  4: { shadowOpacity: 0.12, shadowRadius: 16, elevation: 4 },
  5: { shadowOpacity: 0.16, shadowRadius: 24, elevation: 5 },
} as const;

export const tokens = {
  palette,
  light: lightTheme,
  dark: darkTheme,
  spacing,
  radius,
  typography,
  elevation,
} as const;

export type Tokens = typeof tokens;

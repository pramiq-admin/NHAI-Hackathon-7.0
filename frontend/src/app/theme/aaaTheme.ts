import {StyleSheet} from 'react-native';

export const COLORS = {
  normal: {
    bg: '#0F172A',           // NHAI deep navy (trust)
    bgGradient: '#1E293B',
    surface: '#1E3A8A',      // NHAI brand blue
    surfaceLight: '#334155',
    primary: '#3B82F6',      // bright action blue
    primaryDark: '#1E40AF',
    accent: '#F59E0B',       // highway amber (NHAI signature)
    success: '#10B981',      // verified green
    successLight: '#34D399',
    danger: '#EF4444',
    warning: '#F59E0B',
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    border: '#334155',
    overlay: 'rgba(15, 23, 42, 0.85)',
  },
  aaa: {
    bg: '#000000',
    bgGradient: '#0a0a0a',
    surface: '#1a1a00',
    surfaceLight: '#2a2a00',
    primary: '#FFD700',      // high-vis gold
    primaryDark: '#FFA500',
    accent: '#FF6B00',
    success: '#00FF66',
    successLight: '#33FF99',
    danger: '#FF3333',
    warning: '#FFA500',
    text: '#FFFFFF',
    textSecondary: '#FFD700',
    textMuted: '#FFA500',
    border: '#FFD700',
    overlay: 'rgba(0, 0, 0, 0.92)',
  },
};

export const FONTS = {
  normal: {
    body: 14,
    bodyLg: 16,
    title: 22,
    titleLg: 28,
    action: 16,
    actionLg: 18,
    debug: 11,
    caption: 12,
  },
  aaa: {
    body: 18,
    bodyLg: 20,
    title: 30,
    titleLg: 36,
    action: 22,
    actionLg: 26,
    debug: 14,
    caption: 16,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  pill: 999,
};

// Glassmorphism tokens — used only when glass is enabled (i.e. NOT AAA mode)
export const GLASS = {
  surface: 'rgba(30, 58, 138, 0.30)', // NHAI blue tint + alpha
  surfaceLight: 'rgba(255, 255, 255, 0.10)',
  surfaceDark: 'rgba(0, 0, 0, 0.35)',
  border: 'rgba(255, 255, 255, 0.18)',
  borderStrong: 'rgba(255, 255, 255, 0.30)',
  blur: {low: 12, med: 18, high: 24},
  shadowColor: '#000000',
  shadowOpacity: 0.25,
  shadowRadius: 16,
  shadowOffset: {width: 0, height: 8},
} as const;

export const GRADIENTS = {
  nhai: ['#0A2540', '#1E3A8A', '#0E7C7B'] as const, // welcome / dashboard bg
  nhaiVertical: ['#0A2540', '#1E40AF'] as const,
  success: ['#10B981', '#34D399'] as const,
  danger: ['#EF4444', '#F87171'] as const,
  warning: ['#F59E0B', '#FBBF24'] as const,
  card: ['rgba(30, 58, 138, 0.45)', 'rgba(14, 124, 123, 0.25)'] as const,
};

export type ThemeMode = 'normal' | 'aaa';

export function getTheme(mode: ThemeMode) {
  const colors = COLORS[mode];
  const fonts = FONTS[mode];

  return {
    colors,
    fonts,
    spacing: SPACING,
    radius: RADIUS,
    isAAA: mode === 'aaa',
    styles: StyleSheet.create({
      screenBg: {
        flex: 1,
        backgroundColor: colors.bg,
      },
      title: {
        color: colors.text,
        fontSize: fonts.title,
        fontWeight: '700' as const,
      },
      body: {
        color: colors.text,
        fontSize: fonts.body,
      },
      bodySecondary: {
        color: colors.textSecondary,
        fontSize: fonts.body,
      },
      actionButton: {
        backgroundColor: colors.primary,
        paddingVertical: mode === 'aaa' ? 18 : 14,
        paddingHorizontal: mode === 'aaa' ? 32 : 24,
        borderRadius: mode === 'aaa' ? 16 : 12,
        alignItems: 'center' as const,
      },
      actionButtonText: {
        color: mode === 'aaa' ? '#000' : '#fff',
        fontSize: fonts.action,
        fontWeight: '700' as const,
      },
      dangerButton: {
        backgroundColor: colors.danger,
        paddingVertical: mode === 'aaa' ? 18 : 14,
        paddingHorizontal: mode === 'aaa' ? 32 : 24,
        borderRadius: mode === 'aaa' ? 16 : 12,
        alignItems: 'center' as const,
      },
      card: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        borderWidth: mode === 'aaa' ? 2 : 1,
        borderColor: colors.border,
      },
      input: {
        backgroundColor: colors.bg,
        color: colors.text,
        borderRadius: 8,
        padding: 12,
        fontSize: fonts.body,
        borderWidth: 1,
        borderColor: colors.border,
      },
    }),
  };
}

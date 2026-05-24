import {StyleSheet} from 'react-native';

export const COLORS = {
  normal: {
    bg: '#0f0f23',
    surface: '#1a1a2e',
    primary: '#0096ff',
    success: '#00cc66',
    danger: '#ff4444',
    text: '#ffffff',
    textSecondary: '#aaaaaa',
    border: '#333333',
  },
  aaa: {
    bg: '#000000',
    surface: '#1a1a00',
    primary: '#ffdd00',
    success: '#00ff66',
    danger: '#ff3333',
    text: '#ffffff',
    textSecondary: '#ffdd00',
    border: '#ffdd00',
  },
};

export const FONTS = {
  normal: {
    body: 14,
    title: 20,
    action: 16,
    debug: 12,
  },
  aaa: {
    body: 18,
    title: 28,
    action: 24,
    debug: 14,
  },
};

export type ThemeMode = 'normal' | 'aaa';

export function getTheme(mode: ThemeMode) {
  const colors = COLORS[mode];
  const fonts = FONTS[mode];

  return {
    colors,
    fonts,
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

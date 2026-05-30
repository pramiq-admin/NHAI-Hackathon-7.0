import React from 'react';
import {View, StyleSheet, ViewStyle, Platform} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import {GLASS, COLORS} from '../theme/aaaTheme';
import {useThemeContext} from '../theme/ThemeContext';

type Props = {
  children: React.ReactNode;
  intensity?: 'low' | 'med' | 'high';
  tint?: 'light' | 'dark' | 'xlight';
  style?: ViewStyle | ViewStyle[];
  borderRadius?: number;
  noBorder?: boolean;
};

/**
 * Glass-morphism card. Falls back to a solid surface in AAA mode (no BlurView).
 * Use this only on the 4 designated demo-impact screens: Welcome, Admin Dashboard,
 * Calendar, Punch Result. Other screens should use solid surfaces from existing theme.
 */
export default function GlassCard({
  children,
  intensity = 'med',
  tint = 'light',
  style,
  borderRadius = 20,
  noBorder = false,
}: Props) {
  const {glassEnabled, isAAA} = useThemeContext();
  const c = isAAA ? COLORS.aaa : COLORS.normal;

  // AAA / glass-disabled fallback: solid surface
  if (!glassEnabled) {
    return (
      <View
        style={[
          {
            borderRadius,
            backgroundColor: c.surface,
            borderWidth: noBorder ? 0 : 2,
            borderColor: c.border,
            shadowColor: '#000',
            shadowOffset: {width: 0, height: 4},
            shadowOpacity: 0.4,
            shadowRadius: 8,
            elevation: 6,
          },
          style,
        ]}>
        {children}
      </View>
    );
  }

  const blurAmount = GLASS.blur[intensity];

  return (
    <View
      style={[
        styles.shadow,
        {
          borderRadius,
          overflow: 'hidden',
          borderWidth: noBorder ? 0 : 1,
          borderColor: GLASS.border,
          backgroundColor: GLASS.surface,
        },
        style,
      ]}>
      {Platform.OS === 'ios' ? (
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType={tint}
          blurAmount={blurAmount}
          reducedTransparencyFallbackColor="#1E3A8A"
        />
      ) : (
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType={tint}
          blurAmount={blurAmount}
          reducedTransparencyFallbackColor="#1E3A8A"
          overlayColor="transparent"
        />
      )}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: GLASS.shadowColor,
    shadowOpacity: GLASS.shadowOpacity,
    shadowRadius: GLASS.shadowRadius,
    shadowOffset: GLASS.shadowOffset,
    elevation: 10,
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
});

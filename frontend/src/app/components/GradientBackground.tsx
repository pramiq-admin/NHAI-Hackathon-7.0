import React from 'react';
import {StyleSheet, View, ViewStyle} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {GRADIENTS, COLORS} from '../theme/aaaTheme';
import {useThemeContext} from '../theme/ThemeContext';

type Variant = keyof typeof GRADIENTS;

type Props = {
  children?: React.ReactNode;
  variant?: Variant;
  style?: ViewStyle | ViewStyle[];
  /**
   * If true, AAA mode collapses to a solid bg (no gradient) for max contrast.
   * Defaults to true — pass false to keep the gradient even in AAA (e.g. on Welcome).
   */
  respectAAA?: boolean;
};

export default function GradientBackground({
  children,
  variant = 'nhai',
  style,
  respectAAA = true,
}: Props) {
  const {isAAA} = useThemeContext();
  const c = isAAA ? COLORS.aaa : COLORS.normal;

  if (isAAA && respectAAA) {
    return (
      <View style={[styles.fill, {backgroundColor: c.bg}, style]}>
        {children}
      </View>
    );
  }

  const colors = GRADIENTS[variant] as readonly string[];

  return (
    <LinearGradient
      colors={colors as string[]}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
      style={[styles.fill, style]}>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});

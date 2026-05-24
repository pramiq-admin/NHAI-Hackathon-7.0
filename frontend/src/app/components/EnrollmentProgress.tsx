import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useThemeContext} from '../theme/ThemeContext';

type Props = {
  currentStep: number;
  totalSteps: number;
};

export default function EnrollmentProgress({currentStep, totalSteps}: Props) {
  const {isAAA} = useThemeContext();
  const {t} = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={[styles.stepText, isAAA && styles.stepTextAAA]}>
        {t('enroll.step', {current: currentStep + 1, total: totalSteps})}
      </Text>
      <View style={styles.dotsRow}>
        {Array.from({length: totalSteps}).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < currentStep && styles.dotDone,
              i === currentStep && styles.dotActive,
              isAAA && i === currentStep && styles.dotActiveAAA,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  stepText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
    opacity: 0.8,
  },
  stepTextAAA: {
    fontSize: 18,
    opacity: 1,
    color: '#ffdd00',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#333',
  },
  dotDone: {
    backgroundColor: '#00cc66',
  },
  dotActive: {
    backgroundColor: '#0096ff',
    width: 24,
    borderRadius: 6,
  },
  dotActiveAAA: {
    backgroundColor: '#ffdd00',
    width: 32,
  },
});

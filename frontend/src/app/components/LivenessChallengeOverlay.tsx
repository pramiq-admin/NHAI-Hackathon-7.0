import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useThemeContext} from '../theme/ThemeContext';
import type {ChallengeType} from '../../ml/challenges/challengeEngine';
import type {LivenessPhase} from '../hooks/useLiveness';

type Props = {
  phase: LivenessPhase;
  currentStep: ChallengeType | null;
  stepIndex: number;
  totalSteps: number;
};

const CHALLENGE_I18N: Record<ChallengeType, string> = {
  blink: 'challenge.blink',
  head_left: 'challenge.head_left',
  head_right: 'challenge.head_right',
  smile: 'challenge.smile',
};

export default function LivenessChallengeOverlay({
  phase,
  currentStep,
  stepIndex,
  totalSteps,
}: Props) {
  const {t} = useTranslation();
  const {isAAA} = useThemeContext();

  if (phase === 'idle') return null;

  if (phase === 'passed') {
    return (
      <View style={styles.container}>
        <View style={[styles.banner, styles.bannerPass]}>
          <Text style={[styles.bannerText, isAAA && styles.bannerTextAAA]}>
            {t('challenge.passed')}
          </Text>
        </View>
      </View>
    );
  }

  if (phase === 'failed') {
    return (
      <View style={styles.container}>
        <View style={[styles.banner, styles.bannerFail]}>
          <Text style={[styles.bannerText, isAAA && styles.bannerTextAAA]}>
            {t('challenge.failed')}
          </Text>
        </View>
      </View>
    );
  }

  if (!currentStep) return null;

  return (
    <View style={styles.container}>
      <View style={styles.stepCounter}>
        <Text style={[styles.stepText, isAAA && styles.stepTextAAA]}>
          {stepIndex + 1} / {totalSteps}
        </Text>
      </View>

      <View style={styles.dotsRow}>
        {Array.from({length: totalSteps}).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < stepIndex && styles.dotDone,
              i === stepIndex && styles.dotActive,
            ]}
          />
        ))}
      </View>

      <View style={[styles.instructionBox, isAAA && styles.instructionBoxAAA]}>
        <Text style={[styles.arrow, isAAA && styles.arrowAAA]}>
          {currentStep === 'head_left'
            ? '←'
            : currentStep === 'head_right'
              ? '→'
              : currentStep === 'blink'
                ? '◉'
                : '☺'}
        </Text>
        <Text style={[styles.instruction, isAAA && styles.instructionAAA]}>
          {t(CHALLENGE_I18N[currentStep])}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  stepCounter: {
    marginBottom: 8,
  },
  stepText: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.7,
  },
  stepTextAAA: {
    fontSize: 18,
    color: '#ffdd00',
    opacity: 1,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#555',
  },
  dotDone: {
    backgroundColor: '#00cc66',
  },
  dotActive: {
    backgroundColor: '#0096ff',
    width: 24,
    borderRadius: 6,
  },
  instructionBox: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 200,
  },
  instructionBoxAAA: {
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderWidth: 2,
    borderColor: '#ffdd00',
  },
  arrow: {
    fontSize: 36,
    color: '#fff',
    marginBottom: 8,
  },
  arrowAAA: {
    fontSize: 48,
    color: '#ffdd00',
  },
  instruction: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  instructionAAA: {
    color: '#ffdd00',
    fontSize: 26,
    fontWeight: '700',
  },
  banner: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
  },
  bannerPass: {
    backgroundColor: '#00cc66',
  },
  bannerFail: {
    backgroundColor: '#ff4444',
  },
  bannerText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  bannerTextAAA: {
    fontSize: 28,
    color: '#000',
  },
});

import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';
import type {PipelineResult} from '../../ml/pipeline';
import {useThemeContext} from '../theme/ThemeContext';
import {COLORS} from '../theme/aaaTheme';

type Props = {
  result: PipelineResult | null;
};

export default function AuthResultBanner({result}: Props) {
  const {isAAA} = useThemeContext();
  const {t} = useTranslation();
  const c = isAAA ? COLORS.aaa : COLORS.normal;

  if (!result || result.stage === 'no_face') return null;

  // Big celebratory matched banner
  if (result.stage === 'matched' && result.match) {
    const score = result.match.score;
    const dots = Math.max(1, Math.min(5, Math.round(score * 5)));
    return (
      <View
        style={[
          styles.successBanner,
          {backgroundColor: c.success, shadowColor: c.success},
        ]}>
        <Text style={styles.successIcon}>✓</Text>
        <Text style={styles.successHello}>Welcome back</Text>
        <Text style={styles.successName}>{result.match.name}</Text>
        <View style={styles.metaRow}>
          <View style={styles.metaPill}>
            <Text style={styles.metaPillLabel}>Match</Text>
            <Text style={styles.metaPillValue}>
              {(score * 100).toFixed(0)}%
            </Text>
          </View>
          <View style={styles.confDots}>
            {[0, 1, 2, 3, 4].map(i => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {backgroundColor: i < dots ? '#fff' : 'rgba(255,255,255,0.3)'},
                ]}
              />
            ))}
          </View>
        </View>
        <View style={styles.checklistRow}>
          <ChecklistItem label="Liveness" passed={true} />
          <ChecklistItem
            label="BioHash"
            passed={result.bioHashVerified !== false}
          />
          <ChecklistItem label="Synced" passed={true} />
        </View>
      </View>
    );
  }

  // Non-match / quality / no_templates states
  let message = '';
  let bgColor = c.surface;
  let icon = '⚠️';

  switch (result.stage) {
    case 'no_match':
      message = 'Face not recognized';
      bgColor = c.danger;
      icon = '✗';
      break;
    case 'low_quality':
      message = result.quality?.reason ?? t('verify.low_quality');
      bgColor = c.warning;
      icon = '!';
      break;
    case 'no_templates':
      message = 'No users enrolled yet';
      bgColor = c.surfaceLight;
      icon = 'ℹ';
      break;
  }

  return (
    <View style={[styles.infoBanner, {backgroundColor: bgColor}]}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <Text style={styles.infoText}>{message}</Text>
    </View>
  );
}

function ChecklistItem({label, passed}: {label: string; passed: boolean}) {
  return (
    <View style={styles.checkItem}>
      <Text style={styles.checkMark}>{passed ? '✓' : '○'}</Text>
      <Text style={styles.checkLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  successBanner: {
    position: 'absolute',
    bottom: 110,
    left: 16,
    right: 16,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  successIcon: {
    fontSize: 36,
    color: '#fff',
    fontWeight: '900',
    marginBottom: 4,
  },
  successHello: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  successName: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginVertical: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 8,
  },
  metaPill: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaPillLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '600',
  },
  metaPillValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  confDots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  checklistRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.3)',
    width: '100%',
    justifyContent: 'space-around',
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  checkMark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  checkLabel: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 12,
    fontWeight: '600',
  },
  infoBanner: {
    position: 'absolute',
    bottom: 110,
    left: 16,
    right: 16,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIcon: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
  },
  infoText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

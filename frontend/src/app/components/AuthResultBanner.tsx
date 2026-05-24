import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';
import type {PipelineResult} from '../../ml/pipeline';
import {useThemeContext} from '../theme/ThemeContext';

type Props = {
  result: PipelineResult | null;
};

export default function AuthResultBanner({result}: Props) {
  const {isAAA} = useThemeContext();
  const {t} = useTranslation();

  if (!result || result.stage === 'no_face') return null;

  let message = '';
  let bgColor = 'rgba(0,0,0,0.6)';

  switch (result.stage) {
    case 'matched':
      message = t('verify.matched', {name: result.match?.name ?? '?'});
      bgColor = isAAA ? '#00ff66' : '#00cc66';
      break;
    case 'no_match':
      message = t('verify.no_match');
      bgColor = isAAA ? '#ff3333' : '#ff4444';
      break;
    case 'low_quality':
      message = result.quality?.reason ?? t('verify.low_quality');
      bgColor = '#ff8800';
      break;
    case 'no_templates':
      message = t('verify.no_templates');
      bgColor = '#666';
      break;
  }

  return (
    <View style={[styles.banner, {backgroundColor: bgColor}]}>
      <Text style={[styles.text, isAAA && styles.textAAA]}>{message}</Text>
      {result.match && (
        <Text style={[styles.score, isAAA && styles.scoreAAA]}>
          {t('verify.score', {score: result.match.score.toFixed(2)})}
          {result.embeddingLatencyMs
            ? ` | ${t('verify.latency', {ms: result.embeddingLatencyMs.toFixed(0)})}`
            : ''}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  textAAA: {
    fontSize: 24,
    color: '#000',
  },
  score: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 4,
  },
  scoreAAA: {
    fontSize: 16,
    color: 'rgba(0,0,0,0.7)',
  },
});

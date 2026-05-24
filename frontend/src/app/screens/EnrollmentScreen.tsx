import React, {useEffect, useCallback} from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from 'react-native-vision-camera';
import {useTensorflowModel} from 'react-native-fast-tflite';
import {useRunOnJS} from 'react-native-worklets-core';
import {useTranslation} from 'react-i18next';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {postProcessYuNet} from '../../ml/processors/faceDetect.worklet';
import {extractEmbedding} from '../../ml/processors/faceEmbed.worklet';
import {THRESHOLDS} from '../../ml/thresholds';
import {useFaceAuth} from '../hooks/useFaceAuth';
import {useEnrollment} from '../hooks/useEnrollment';
import {useVoicePrompt} from '../components/VoicePrompt';
import EnrollmentProgress from '../components/EnrollmentProgress';
import {useThemeContext} from '../theme/ThemeContext';
import type {RootStackParamList} from '../navigation/RootStack';

const YUNET_INPUT = 640;
const CONFIDENCE_MIN = THRESHOLDS.DETECTION_CONFIDENCE;

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Enroll'>;
};

export default function EnrollmentScreen({navigation}: Props) {
  const {t} = useTranslation();
  const {isAAA} = useThemeContext();
  const {hasPermission} = useCameraPermission();
  const device = useCameraDevice('front');
  const {speak, stop} = useVoicePrompt();

  useEffect(() => {
    return () => stop();
  }, [stop]);

  const {detection, fps, hasFace, latestEmbeddingRef, onFrameResult} = useFaceAuth();

  const enrollment = useEnrollment();

  const yunet = useTensorflowModel(
    require('../../../assets/models/yunet_int8.tflite'),
  );
  const edgeface = useTensorflowModel(
    require('../../../assets/models/edgeface_xs_int8.tflite'),
  );

  const yunetModel = yunet.state === 'loaded' ? yunet.model : undefined;
  const edgefaceModel = edgeface.state === 'loaded' ? edgeface.model : undefined;

  const onFrameResultJS = useRunOnJS(onFrameResult, [onFrameResult]);

  const frameProcessor = useFrameProcessor(
    frame => {
      'worklet';
      if (!yunetModel) return;
      const start = performance.now();
      try {
        const out = yunetModel.runSync([frame as any]);
        if (out && out.length >= 4) {
          const dets = postProcessYuNet(
            out as unknown as ArrayBuffer[],
            YUNET_INPUT, YUNET_INPUT,
            frame.width, frame.height,
          );
          const latency = performance.now() - start;
          if (dets.length > 0 && edgefaceModel && dets[0].confidence > CONFIDENCE_MIN) {
            const emb = extractEmbedding(edgefaceModel, frame);
            onFrameResultJS(dets[0], emb, latency);
          } else if (dets.length > 0) {
            onFrameResultJS(dets[0], null, latency);
          } else {
            onFrameResultJS(null, null, latency);
          }
        }
      } catch {}
    },
    [yunetModel, edgefaceModel, onFrameResultJS],
  );

  useEffect(() => {
    if (enrollment.step !== 'idle' && enrollment.step !== 'processing' && enrollment.step !== 'done' && enrollment.step !== 'error') {
      const label = t(enrollment.stepLabel);
      speak(label);
    }
  }, [enrollment.step, enrollment.stepLabel, speak, t]);

  useEffect(() => {
    if (enrollment.step === 'done') {
      speak(t('enroll.success'), true);
    } else if (enrollment.step === 'error') {
      speak(t('enroll.fail'), true);
    }
  }, [enrollment.step, speak, t]);

  const handleCapture = useCallback(() => {
    if (!latestEmbeddingRef.current) {
      Alert.alert(t('enroll.no_face'));
      return;
    }
    enrollment.captureEmbedding([...latestEmbeddingRef.current]);
  }, [enrollment, latestEmbeddingRef, t]);

  const handleStart = useCallback(() => {
    if (!enrollment.userId.trim() || !enrollment.name.trim()) {
      Alert.alert(t('common.error'), t('enroll.error_fields'));
      return;
    }
    enrollment.startEnrollment(enrollment.userId.trim(), enrollment.name.trim());
  }, [enrollment]);

  if (!device || !hasPermission) {
    return (
      <View style={[styles.container, isAAA && styles.containerAAA]}>
        <Text style={[styles.message, isAAA && styles.textAAA]}>{t('common.loading')}</Text>
      </View>
    );
  }

  // Input form
  if (enrollment.step === 'idle') {
    return (
      <View style={[styles.container, isAAA && styles.containerAAA]}>
        <View style={styles.form}>
          <Text style={[styles.title, isAAA && styles.titleAAA]}>{t('enroll.title')}</Text>
          <TextInput
            style={[styles.input, isAAA && styles.inputAAA]}
            placeholder={t('enroll.enter_id')}
            placeholderTextColor={isAAA ? '#999900' : '#666'}
            value={enrollment.userId}
            onChangeText={enrollment.setUserId}
          />
          <TextInput
            style={[styles.input, isAAA && styles.inputAAA]}
            placeholder={t('enroll.enter_name')}
            placeholderTextColor={isAAA ? '#999900' : '#666'}
            value={enrollment.name}
            onChangeText={enrollment.setName}
          />
          <TouchableOpacity style={[styles.startBtn, isAAA && styles.startBtnAAA]} onPress={handleStart}>
            <Text style={[styles.startBtnText, isAAA && styles.startBtnTextAAA]}>{t('enroll.start')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}>
            <Text style={[styles.backBtnText, isAAA && styles.textAAA]}>{t('common.back')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Processing
  if (enrollment.step === 'processing') {
    return (
      <View style={[styles.container, isAAA && styles.containerAAA]}>
        <View style={styles.form}>
          <ActivityIndicator size="large" color={isAAA ? '#ffdd00' : '#0096ff'} />
          <Text style={[styles.title, isAAA && styles.titleAAA, {marginTop: 24}]}>
            {t('enroll.processing')}
          </Text>
        </View>
      </View>
    );
  }

  // Done / Error
  if (enrollment.step === 'done' || enrollment.step === 'error') {
    return (
      <View style={[styles.container, isAAA && styles.containerAAA]}>
        <View style={styles.form}>
          <Text style={[styles.title, enrollment.step === 'done' ? styles.successText : styles.errorText]}>
            {enrollment.step === 'done' ? t('enroll.success') : t('enroll.fail')}
          </Text>
          {enrollment.error && <Text style={styles.errorDetail}>{enrollment.error}</Text>}
          <TouchableOpacity
            style={[styles.startBtn, isAAA && styles.startBtnAAA]}
            onPress={() => {
              enrollment.reset();
              navigation.goBack();
            }}>
            <Text style={[styles.startBtnText, isAAA && styles.startBtnTextAAA]}>{t('common.back')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Camera capture steps
  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
        pixelFormat="yuv"
      />

      <View style={styles.guideOverlay} pointerEvents="none">
        <View style={[styles.faceGuide, isAAA && styles.faceGuideAAA]} />
      </View>

      <View style={styles.topBar}>
        <EnrollmentProgress
          currentStep={enrollment.stepIndex}
          totalSteps={enrollment.totalSteps}
        />
        <Text style={[styles.stepInstruction, isAAA && styles.stepInstructionAAA]}>
          {t(enrollment.stepLabel)}
        </Text>
      </View>

      {detection && (
        <View
          style={[
            styles.bbox,
            {
              left: detection.x,
              top: detection.y,
              width: detection.width,
              height: detection.height,
            },
          ]}
        />
      )}

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.captureBtn,
            isAAA && styles.captureBtnAAA,
            !hasFace && styles.captureBtnDisabled,
          ]}
          onPress={handleCapture}
          disabled={!hasFace}>
          <Text style={[styles.captureBtnText, isAAA && styles.captureBtnTextAAA]}>
            {hasFace ? t('enroll.capture_btn') : t('enroll.no_face')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.debugBar}>
        <Text style={styles.debugText}>
          {fps > 0 ? `${fps} FPS` : ''}
          {detection ? ` | ${detection.confidence.toFixed(2)}` : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  containerAAA: {
    backgroundColor: '#000',
  },
  message: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  textAAA: {
    color: '#ffdd00',
    fontSize: 18,
  },
  form: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  titleAAA: {
    color: '#ffdd00',
    fontSize: 32,
  },
  input: {
    backgroundColor: '#1a1a2e',
    color: '#fff',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  inputAAA: {
    borderWidth: 2,
    borderColor: '#ffdd00',
    backgroundColor: '#1a1a00',
    color: '#ffdd00',
    fontSize: 18,
  },
  startBtn: {
    backgroundColor: '#0096ff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  startBtnAAA: {
    backgroundColor: '#ffdd00',
    paddingVertical: 22,
    borderRadius: 16,
  },
  startBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  startBtnTextAAA: {
    color: '#000',
    fontSize: 24,
    fontWeight: '700',
  },
  backBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  backBtnText: {
    color: '#aaa',
    fontSize: 14,
  },
  successText: {
    color: '#00cc66',
  },
  errorText: {
    color: '#ff4444',
  },
  errorDetail: {
    color: '#ff8888',
    fontSize: 14,
    textAlign: 'center',
  },
  guideOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceGuide: {
    width: 250,
    height: 320,
    borderRadius: 125,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    borderStyle: 'dashed',
  },
  faceGuideAAA: {
    borderWidth: 4,
    borderColor: '#ffdd00',
  },
  topBar: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  stepInstruction: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  stepInstructionAAA: {
    fontSize: 24,
    color: '#ffdd00',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  bbox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#0096ff',
    borderRadius: 4,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureBtn: {
    backgroundColor: '#0096ff',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
  },
  captureBtnAAA: {
    backgroundColor: '#ffdd00',
    paddingVertical: 22,
    paddingHorizontal: 56,
  },
  captureBtnDisabled: {
    backgroundColor: '#444',
  },
  captureBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  captureBtnTextAAA: {
    color: '#000',
    fontSize: 24,
    fontWeight: '700',
  },
  debugBar: {
    position: 'absolute',
    top: 140,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  debugText: {
    color: '#0f0',
    fontSize: 11,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
});

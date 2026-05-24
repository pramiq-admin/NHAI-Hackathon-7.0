import React, {useEffect, useState, useCallback} from 'react';
import {StyleSheet, Text, View, Alert, Linking} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from 'react-native-vision-camera';
import {useTensorflowModel} from 'react-native-fast-tflite';
import {useRunOnJS} from 'react-native-worklets-core';

type BBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
};

const YUNET_INPUT = 640;
const CONFIDENCE_THRESHOLD = 0.7;

export default function CameraScreen() {
  const {hasPermission, requestPermission} = useCameraPermission();
  const device = useCameraDevice('front');
  const [bbox, setBBox] = useState<BBox | null>(null);
  const [fps, setFps] = useState(0);

  const yunet = useTensorflowModel(
    require('../../../assets/models/yunet_int8.tflite'),
  );
  const model = yunet.state === 'loaded' ? yunet.model : undefined;

  useEffect(() => {
    if (!hasPermission) {
      requestPermission().then(granted => {
        if (!granted) {
          Alert.alert(
            'Camera Permission Required',
            'Please enable camera access in Settings.',
            [
              {text: 'Open Settings', onPress: () => Linking.openSettings()},
              {text: 'Cancel', style: 'cancel'},
            ],
          );
        }
      });
    }
  }, [hasPermission, requestPermission]);

  const onDetection = useCallback((detection: BBox | null, latency: number) => {
    setBBox(detection);
    if (latency > 0) setFps(Math.round(1000 / latency));
  }, []);

  const onDetectionJS = useRunOnJS(onDetection, [onDetection]);

  const frameProcessor = useFrameProcessor(
    frame => {
      'worklet';
      if (!model) return;

      const start = performance.now();

      try {
        const outputs = model.runSync([frame]);

        if (outputs && outputs.length >= 4) {
          // YuNet outputs: cls scores at stride 8 (finest scale)
          const cls8 = outputs[0] as unknown as Float32Array;
          const numAnchors = cls8.length;

          let bestScore = 0;
          let bestIdx = -1;
          for (let i = 0; i < numAnchors; i++) {
            if (cls8[i] > bestScore) {
              bestScore = cls8[i];
              bestIdx = i;
            }
          }

          const latency = performance.now() - start;

          if (bestScore > CONFIDENCE_THRESHOLD && bestIdx >= 0) {
            // Approximate bbox from grid position
            const gridW = YUNET_INPUT / 8;
            const gridX = bestIdx % gridW;
            const gridY = Math.floor(bestIdx / gridW);

            const scaleX = frame.width / YUNET_INPUT;
            const scaleY = frame.height / YUNET_INPUT;

            onDetectionJS(
              {
                x: (gridX * 8 - 40) * scaleX,
                y: (gridY * 8 - 40) * scaleY,
                width: 80 * scaleX,
                height: 100 * scaleY,
                confidence: bestScore,
              },
              latency,
            );
          } else {
            onDetectionJS(null, latency);
          }
        }
      } catch {
        // Model inference error — skip frame
      }
    },
    [model, onDetectionJS],
  );

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>No front camera found</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Camera permission required</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
        pixelFormat="yuv"
      />

      {/* Bounding box overlay */}
      {bbox && (
        <View
          style={[
            styles.bbox,
            {
              left: bbox.x,
              top: bbox.y,
              width: bbox.width,
              height: bbox.height,
            },
          ]}
        />
      )}

      {/* Face guide */}
      <View style={styles.overlay}>
        <View style={styles.faceGuide} />
        {yunet.state === 'loading' && (
          <Text style={styles.status}>Loading model...</Text>
        )}
        {yunet.state === 'error' && (
          <Text style={[styles.status, styles.error]}>
            Model error: {yunet.error?.message}
          </Text>
        )}
        {yunet.state === 'loaded' && (
          <Text style={styles.instruction}>
            Position your face within the frame
          </Text>
        )}
      </View>

      {/* Debug info */}
      <View style={styles.debugBar}>
        <Text style={styles.debugText}>
          {fps > 0 ? `${fps} FPS` : 'Waiting...'}
          {bbox ? ` | Score: ${bbox.confidence.toFixed(2)}` : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  message: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  faceGuide: {
    width: 250,
    height: 320,
    borderRadius: 125,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderStyle: 'dashed',
  },
  instruction: {
    color: '#fff',
    fontSize: 14,
    marginTop: 20,
    opacity: 0.8,
  },
  status: {
    color: '#fff',
    fontSize: 12,
    marginTop: 16,
    opacity: 0.6,
  },
  error: {
    color: '#ff4444',
    opacity: 1,
  },
  bbox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#00ff00',
    borderRadius: 4,
  },
  debugBar: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  debugText: {
    color: '#0f0',
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
});

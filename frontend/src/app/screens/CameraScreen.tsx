import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View, Alert, Linking} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from 'react-native-vision-camera';
import {useTensorflowModel} from 'react-native-fast-tflite';
import {useResizePlugin} from 'react-native-vision-camera';

export default function CameraScreen() {
  const {hasPermission, requestPermission} = useCameraPermission();
  const device = useCameraDevice('front');
  const [faceDetected, setFaceDetected] = useState(false);

  // Load YuNet TFLite model
  const yunet = useTensorflowModel(
    require('../../../assets/models/yunet_int8.tflite'),
  );
  const model = yunet.state === 'loaded' ? yunet.model : undefined;

  // Resize plugin for frame preprocessing
  const {resize} = useResizePlugin();

  useEffect(() => {
    if (!hasPermission) {
      requestPermission().then(granted => {
        if (!granted) {
          Alert.alert(
            'Camera Permission Required',
            'Please enable camera access in Settings to use face authentication.',
            [
              {text: 'Open Settings', onPress: () => Linking.openSettings()},
              {text: 'Cancel', style: 'cancel'},
            ],
          );
        }
      });
    }
  }, [hasPermission, requestPermission]);

  const frameProcessor = useFrameProcessor(
    frame => {
      'worklet';
      if (!model) return;

      // Resize frame to YuNet expected input: 640x640 RGB
      const resized = resize(frame, {
        scale: {width: 640, height: 640},
        pixelFormat: 'rgb',
        dataType: 'float32',
      });

      // Run YuNet inference
      const outputs = model.runSync([resized]);

      // YuNet outputs 12 tensors: cls/obj/bbox/kps at 3 scales (8/16/32)
      // cls_8 shape: [1, 6400, 1] — confidence scores at stride 8
      if (outputs && outputs.length > 0) {
        const cls8 = outputs[0]; // confidence scores at finest scale
        // Check if any detection has confidence > 0.7
        let detected = false;
        if (cls8 && cls8.length > 0) {
          for (let i = 0; i < Math.min(cls8.length, 6400); i++) {
            if ((cls8 as Float32Array)[i] > 0.7) {
              detected = true;
              break;
            }
          }
        }
        // Note: can't call setState from worklet directly, need Shared Values
        // For now we just log — will wire up with useSharedValue in Phase 2
      }
    },
    [model, resize],
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
        pixelFormat="rgb"
      />
      <View style={styles.overlay}>
        <View style={styles.faceGuide} />
        {yunet.state === 'loading' && (
          <Text style={styles.status}>Loading face detection model...</Text>
        )}
        {yunet.state === 'error' && (
          <Text style={[styles.status, styles.error]}>
            Model load error: {yunet.error?.message}
          </Text>
        )}
        {yunet.state === 'loaded' && (
          <Text style={styles.instruction}>
            Position your face within the frame
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    color: '#fff',
    fontSize: 16,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceGuide: {
    width: 250,
    height: 320,
    borderRadius: 125,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
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
});

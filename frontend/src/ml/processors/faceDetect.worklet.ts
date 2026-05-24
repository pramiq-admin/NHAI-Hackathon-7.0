import type {TensorflowModel} from 'react-native-fast-tflite';
import {THRESHOLDS} from '../thresholds';

export type FaceDetection = {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  landmarks: {x: number; y: number}[];
};

/**
 * Post-process YuNet TFLite outputs into face detections.
 * YuNet outputs 12 tensors at 3 scales (stride 8/16/32):
 *   cls_N  [1, anchors, 1]  — classification score
 *   obj_N  [1, anchors, 1]  — objectness score
 *   bbox_N [1, anchors, 4]  — bounding box (cx, cy, w, h)
 *   kps_N  [1, anchors, 10] — 5 keypoints (x1,y1,...,x5,y5)
 */
export function postProcessYuNet(
  outputs: ArrayBuffer[],
  inputWidth: number,
  inputHeight: number,
  frameWidth: number,
  frameHeight: number,
): FaceDetection[] {
  'worklet';

  const detections: FaceDetection[] = [];
  const strides = [8, 16, 32];

  for (let scaleIdx = 0; scaleIdx < 3; scaleIdx++) {
    const cls = new Float32Array(outputs[scaleIdx]);
    const obj = new Float32Array(outputs[scaleIdx + 3]);
    const bbox = new Float32Array(outputs[scaleIdx + 6]);
    const kps = new Float32Array(outputs[scaleIdx + 9]);

    const stride = strides[scaleIdx];
    const gridW = Math.floor(inputWidth / stride);
    const gridH = Math.floor(inputHeight / stride);
    const numAnchors = gridW * gridH;

    const scaleX = frameWidth / inputWidth;
    const scaleY = frameHeight / inputHeight;

    for (let i = 0; i < numAnchors; i++) {
      const score = cls[i] * obj[i];
      if (score < THRESHOLDS.DETECTION_CONFIDENCE) continue;

      const gridX = i % gridW;
      const gridY = Math.floor(i / gridW);

      const cx = (gridX + bbox[i * 4]) * stride * scaleX;
      const cy = (gridY + bbox[i * 4 + 1]) * stride * scaleY;
      const w = Math.exp(bbox[i * 4 + 2]) * stride * scaleX;
      const h = Math.exp(bbox[i * 4 + 3]) * stride * scaleY;

      const landmarks: {x: number; y: number}[] = [];
      for (let j = 0; j < 5; j++) {
        landmarks.push({
          x: (gridX + kps[i * 10 + j * 2]) * stride * scaleX,
          y: (gridY + kps[i * 10 + j * 2 + 1]) * stride * scaleY,
        });
      }

      detections.push({
        x: cx - w / 2,
        y: cy - h / 2,
        width: w,
        height: h,
        confidence: score,
        landmarks,
      });
    }
  }

  return nms(detections, THRESHOLDS.DETECTION_IOU_NMS);
}

function nms(
  detections: FaceDetection[],
  iouThreshold: number,
): FaceDetection[] {
  'worklet';

  detections.sort((a, b) => b.confidence - a.confidence);
  const kept: FaceDetection[] = [];

  for (const det of detections) {
    let dominated = false;
    for (const k of kept) {
      if (iou(det, k) > iouThreshold) {
        dominated = true;
        break;
      }
    }
    if (!dominated) kept.push(det);
  }

  return kept;
}

function iou(a: FaceDetection, b: FaceDetection): number {
  'worklet';

  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);

  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = a.width * a.height + b.width * b.height - inter;

  return union > 0 ? inter / union : 0;
}

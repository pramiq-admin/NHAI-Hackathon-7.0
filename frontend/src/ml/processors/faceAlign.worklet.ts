/**
 * Face alignment via ArcFace 5-point landmark similarity transform.
 *
 * Currently NOT called from the frame processor — react-native-fast-tflite
 * auto-resizes the camera frame to EdgeFace's 112x112 input shape, which is
 * functional but suboptimal (includes background). Use these helpers when
 * porting alignment to a native frame processor plugin for Phase 8 accuracy
 * tuning, or when `frame.toArrayBuffer()` is wired up for CPU-side cropping.
 */
import type {FaceDetection} from './faceDetect.worklet';

// ArcFace canonical landmark positions for 112x112
const DST_LANDMARKS = [
  {x: 38.2946, y: 51.6963}, // left eye
  {x: 73.5318, y: 51.5014}, // right eye
  {x: 56.0252, y: 71.7366}, // nose
  {x: 41.5493, y: 92.3655}, // left mouth
  {x: 70.7299, y: 92.2041}, // right mouth
];

type AffineMatrix = [number, number, number, number, number, number];

export function computeAlignTransform(
  detection: FaceDetection,
): AffineMatrix | null {
  'worklet';

  if (detection.landmarks.length < 5) return null;

  const src = detection.landmarks;
  const dst = DST_LANDMARKS;

  // Compute similarity transform (rotation + scale + translation)
  // using least-squares on the first 2 points (eyes)
  const srcCx = (src[0].x + src[1].x) / 2;
  const srcCy = (src[0].y + src[1].y) / 2;
  const dstCx = (dst[0].x + dst[1].x) / 2;
  const dstCy = (dst[0].y + dst[1].y) / 2;

  const srcDx = src[1].x - src[0].x;
  const srcDy = src[1].y - src[0].y;
  const dstDx = dst[1].x - dst[0].x;
  const dstDy = dst[1].y - dst[0].y;

  const srcDist = Math.sqrt(srcDx * srcDx + srcDy * srcDy);
  const dstDist = Math.sqrt(dstDx * dstDx + dstDy * dstDy);

  if (srcDist < 1e-6) return null;

  const scale = dstDist / srcDist;

  const srcAngle = Math.atan2(srcDy, srcDx);
  const dstAngle = Math.atan2(dstDy, dstDx);
  const angle = dstAngle - srcAngle;

  const cosA = Math.cos(angle) * scale;
  const sinA = Math.sin(angle) * scale;

  const tx = dstCx - (cosA * srcCx - sinA * srcCy);
  const ty = dstCy - (sinA * srcCx + cosA * srcCy);

  return [cosA, -sinA, tx, sinA, cosA, ty];
}

export function cropAlignedFace(
  frameData: Float32Array,
  frameWidth: number,
  frameHeight: number,
  channels: number,
  transform: AffineMatrix,
): Float32Array {
  'worklet';

  const OUT_SIZE = 112;
  const result = new Float32Array(OUT_SIZE * OUT_SIZE * channels);

  const [a, b, tx, c, d, ty] = transform;
  const det = a * d - b * c;
  if (Math.abs(det) < 1e-10) return result;

  // Inverse transform: src = inv(M) * dst
  const ia = d / det;
  const ib = -b / det;
  const ic = -c / det;
  const id = a / det;
  const itx = -(ia * tx + ib * ty);
  const ity = -(ic * tx + id * ty);

  for (let dy = 0; dy < OUT_SIZE; dy++) {
    for (let dx = 0; dx < OUT_SIZE; dx++) {
      const sx = ia * dx + ib * dy + itx;
      const sy = ic * dx + id * dy + ity;

      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);

      if (x0 >= 0 && x0 < frameWidth && y0 >= 0 && y0 < frameHeight) {
        const srcIdx = (y0 * frameWidth + x0) * channels;
        const dstIdx = (dy * OUT_SIZE + dx) * channels;
        for (let ch = 0; ch < channels; ch++) {
          result[dstIdx + ch] = frameData[srcIdx + ch];
        }
      }
    }
  }

  return result;
}

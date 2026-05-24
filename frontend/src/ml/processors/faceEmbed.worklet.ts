import type {TensorflowModel} from 'react-native-fast-tflite';

export type EmbeddingResult = {
  embedding: number[];
  magnitude: number;
  latencyMs: number;
};

export function extractEmbedding(
  model: TensorflowModel,
  frame: any,
): EmbeddingResult | null {
  'worklet';

  const start = performance.now();

  try {
    const outputs = model.runSync([frame]);

    if (!outputs || outputs.length === 0) return null;

    const raw = outputs[0] as unknown as Float32Array;
    if (!raw || raw.length !== 512) return null;

    // MagFace quality: L2 norm before normalization correlates with quality
    let sumSq = 0;
    for (let i = 0; i < 512; i++) {
      sumSq += raw[i] * raw[i];
    }
    const magnitude = Math.sqrt(sumSq);

    // L2-normalize for cosine similarity
    const embedding: number[] = new Array(512);
    if (magnitude > 1e-8) {
      for (let i = 0; i < 512; i++) {
        embedding[i] = raw[i] / magnitude;
      }
    } else {
      for (let i = 0; i < 512; i++) {
        embedding[i] = 0;
      }
    }

    return {
      embedding,
      magnitude,
      latencyMs: performance.now() - start,
    };
  } catch {
    return null;
  }
}

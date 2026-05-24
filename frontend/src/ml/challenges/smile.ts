export type SmileState = 'waiting' | 'passed' | 'failed';

const SMILE_THRESHOLD = 0.7;
const SUSTAINED_MS = 300;
const TIMEOUT_MS = 3000;

export function initSmileState(): SmileState {
  return 'waiting';
}

export function updateSmileState(
  state: SmileState,
  smilingProbability: number,
  elapsedMs: number,
  sustainedMs: number,
): SmileState {
  if (state === 'passed' || state === 'failed') return state;
  if (elapsedMs > TIMEOUT_MS) return 'failed';

  if (smilingProbability > SMILE_THRESHOLD && sustainedMs >= SUSTAINED_MS) {
    return 'passed';
  }
  return 'waiting';
}

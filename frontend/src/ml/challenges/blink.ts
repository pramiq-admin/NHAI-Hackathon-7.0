export type BlinkState =
  | 'waiting_close'
  | 'waiting_open'
  | 'passed'
  | 'failed';

const EYE_CLOSED = 0.3;
const EYE_OPEN = 0.7;
const TIMEOUT_MS = 3000;

export function initBlinkState(): BlinkState {
  return 'waiting_close';
}

export function updateBlinkState(
  state: BlinkState,
  leftEyeOpen: number,
  rightEyeOpen: number,
  elapsedMs: number,
): BlinkState {
  if (state === 'passed' || state === 'failed') return state;
  if (elapsedMs > TIMEOUT_MS) return 'failed';

  const bothClosed = leftEyeOpen < EYE_CLOSED && rightEyeOpen < EYE_CLOSED;
  const bothOpen = leftEyeOpen > EYE_OPEN && rightEyeOpen > EYE_OPEN;

  switch (state) {
    case 'waiting_close':
      return bothClosed ? 'waiting_open' : 'waiting_close';
    case 'waiting_open':
      return bothOpen ? 'passed' : 'waiting_open';
    default:
      return state;
  }
}

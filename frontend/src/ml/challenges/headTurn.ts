export type HeadTurnDirection = 'left' | 'right';

export type HeadTurnState =
  | 'waiting_turn'
  | 'waiting_return'
  | 'passed'
  | 'failed';

const TURN_THRESHOLD = 25;
const CENTER_THRESHOLD = 10;
const TIMEOUT_MS = 3000;

export function initHeadTurnState(): HeadTurnState {
  return 'waiting_turn';
}

export function updateHeadTurnState(
  state: HeadTurnState,
  direction: HeadTurnDirection,
  yawAngle: number,
  elapsedMs: number,
): HeadTurnState {
  if (state === 'passed' || state === 'failed') return state;
  if (elapsedMs > TIMEOUT_MS) return 'failed';

  const isTurned =
    direction === 'left'
      ? yawAngle < -TURN_THRESHOLD
      : yawAngle > TURN_THRESHOLD;
  const isCenter = Math.abs(yawAngle) < CENTER_THRESHOLD;

  switch (state) {
    case 'waiting_turn':
      return isTurned ? 'waiting_return' : 'waiting_turn';
    case 'waiting_return':
      return isCenter ? 'passed' : 'waiting_return';
    default:
      return state;
  }
}

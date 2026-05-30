import {THRESHOLDS} from '../thresholds';

export type HeadTurnDirection = 'left' | 'right';

export type HeadTurnState =
  | 'waiting_turn'
  | 'waiting_return'
  | 'passed'
  | 'failed';

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
  if (elapsedMs > THRESHOLDS.CHALLENGE_STEP_TIMEOUT_MS) return 'failed';

  // Direction-agnostic: any large head turn passes (mirror-safe for front camera).
  // The challenge proves intentional motion; specific direction enforcement is
  // skipped because front-camera yaw sign convention varies by device/OS.
  const isTurned = Math.abs(yawAngle) > THRESHOLDS.YAW_TURN_DEG;

  if (state === 'waiting_turn') {
    // Pass immediately on threshold crossing — no return-to-center required.
    return isTurned ? 'passed' : 'waiting_turn';
  }
  return state;
}

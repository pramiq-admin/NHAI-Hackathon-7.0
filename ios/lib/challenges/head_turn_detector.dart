import '../ml/thresholds.dart';

/// Head turn detection states.
enum HeadTurnState {
  waitingTurn,
  turned,
  returned,
  passed,
  failed,
}

/// Target direction for head turn challenge.
enum TurnDirection { left, right }

/// Immutable head turn detection state container.
class HeadTurnDetectorState {
  final HeadTurnState state;
  final TurnDirection targetDirection;
  final int elapsedMs;

  const HeadTurnDetectorState({
    required this.state,
    required this.targetDirection,
    this.elapsedMs = 0,
  });
}

/// Create the initial head turn detection state.
HeadTurnDetectorState initHeadTurnState(TurnDirection direction) {
  return HeadTurnDetectorState(
    state: HeadTurnState.waitingTurn,
    targetDirection: direction,
  );
}

/// Pure function: advance head turn state machine based on yaw angle.
///
/// The user must turn their head past [headTurnAngle] in the target direction,
/// then return to center. Yaw convention: negative = left, positive = right.
HeadTurnDetectorState detectHeadTurn(
  HeadTurnDetectorState current,
  double? yawAngle,
  int deltaMs,
) {
  // Terminal states.
  if (current.state == HeadTurnState.passed ||
      current.state == HeadTurnState.failed) {
    return current;
  }

  final newElapsed = current.elapsedMs + deltaMs;

  // Timeout check.
  if (newElapsed >= Thresholds.challengeTimeoutMs) {
    return HeadTurnDetectorState(
      state: HeadTurnState.failed,
      targetDirection: current.targetDirection,
      elapsedMs: newElapsed,
    );
  }

  final yaw = yawAngle ?? 0.0;

  // Check if head is turned to target.
  bool isTurnedToTarget() {
    switch (current.targetDirection) {
      case TurnDirection.left:
        return yaw < -Thresholds.headTurnAngle;
      case TurnDirection.right:
        return yaw > Thresholds.headTurnAngle;
    }
  }

  // Check if head has returned to center (within a small tolerance).
  bool isReturnedToCenter() {
    return yaw.abs() < 10.0;
  }

  switch (current.state) {
    case HeadTurnState.waitingTurn:
      if (isTurnedToTarget()) {
        return HeadTurnDetectorState(
          state: HeadTurnState.turned,
          targetDirection: current.targetDirection,
          elapsedMs: newElapsed,
        );
      }
      return HeadTurnDetectorState(
        state: HeadTurnState.waitingTurn,
        targetDirection: current.targetDirection,
        elapsedMs: newElapsed,
      );

    case HeadTurnState.turned:
      if (isReturnedToCenter()) {
        return HeadTurnDetectorState(
          state: HeadTurnState.passed,
          targetDirection: current.targetDirection,
          elapsedMs: newElapsed,
        );
      }
      return HeadTurnDetectorState(
        state: HeadTurnState.turned,
        targetDirection: current.targetDirection,
        elapsedMs: newElapsed,
      );

    case HeadTurnState.returned:
    case HeadTurnState.passed:
    case HeadTurnState.failed:
      return current;
  }
}

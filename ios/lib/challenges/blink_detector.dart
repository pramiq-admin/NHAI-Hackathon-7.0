import '../ml/thresholds.dart';

/// Blink detection states.
enum BlinkState {
  waitingClose,
  waitingOpen,
  passed,
  failed,
}

/// Immutable blink detection state container.
class BlinkDetectorState {
  final BlinkState state;
  final int elapsedMs;

  const BlinkDetectorState({
    required this.state,
    this.elapsedMs = 0,
  });
}

/// Create the initial blink detection state.
BlinkDetectorState initBlinkState() {
  return const BlinkDetectorState(state: BlinkState.waitingClose);
}

/// Pure function: advance blink state machine based on eye openness.
///
/// Both eyes must close (< earClosed) then reopen (> earOpen) within the timeout.
BlinkDetectorState updateBlinkState(
  BlinkDetectorState current,
  double? leftEyeOpen,
  double? rightEyeOpen,
  int deltaMs,
) {
  // Terminal states — no transitions.
  if (current.state == BlinkState.passed ||
      current.state == BlinkState.failed) {
    return current;
  }

  final newElapsed = current.elapsedMs + deltaMs;

  // Timeout check.
  if (newElapsed >= Thresholds.challengeTimeoutMs) {
    return BlinkDetectorState(state: BlinkState.failed, elapsedMs: newElapsed);
  }

  // Default to 0.5 (neutral) if detection did not provide values.
  final leftProb = leftEyeOpen ?? 0.5;
  final rightProb = rightEyeOpen ?? 0.5;

  switch (current.state) {
    case BlinkState.waitingClose:
      // Both eyes must be below the closed threshold.
      if (leftProb < Thresholds.earClosed && rightProb < Thresholds.earClosed) {
        return BlinkDetectorState(
          state: BlinkState.waitingOpen,
          elapsedMs: newElapsed,
        );
      }
      return BlinkDetectorState(
        state: BlinkState.waitingClose,
        elapsedMs: newElapsed,
      );

    case BlinkState.waitingOpen:
      // Both eyes must reopen above the open threshold.
      if (leftProb > Thresholds.earOpen && rightProb > Thresholds.earOpen) {
        return BlinkDetectorState(
          state: BlinkState.passed,
          elapsedMs: newElapsed,
        );
      }
      return BlinkDetectorState(
        state: BlinkState.waitingOpen,
        elapsedMs: newElapsed,
      );

    case BlinkState.passed:
    case BlinkState.failed:
      return current;
  }
}

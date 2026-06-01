import '../ml/thresholds.dart';

/// Smile detection states.
enum SmileState {
  waiting,
  passed,
  failed,
}

/// Immutable smile detection state container.
class SmileDetectorState {
  final SmileState state;
  final int elapsedMs;
  final int sustainedMs;

  const SmileDetectorState({
    required this.state,
    this.elapsedMs = 0,
    this.sustainedMs = 0,
  });
}

/// Minimum time smile must be sustained to pass (ms).
const int _smileSustainMs = 200;

/// Create the initial smile detection state.
SmileDetectorState initSmileState() {
  return const SmileDetectorState(state: SmileState.waiting);
}

/// Pure function: advance smile state machine based on smile probability.
///
/// Smile must exceed [smileThreshold] and be sustained for a brief period.
SmileDetectorState detectSmile(
  SmileDetectorState current,
  double? smilingProbability,
  int deltaMs,
) {
  // Terminal states.
  if (current.state == SmileState.passed ||
      current.state == SmileState.failed) {
    return current;
  }

  final newElapsed = current.elapsedMs + deltaMs;

  // Timeout check.
  if (newElapsed >= Thresholds.challengeTimeoutMs) {
    return SmileDetectorState(
      state: SmileState.failed,
      elapsedMs: newElapsed,
      sustainedMs: current.sustainedMs,
    );
  }

  final smileProb = smilingProbability ?? 0.0;

  if (smileProb > Thresholds.smileThreshold) {
    final newSustained = current.sustainedMs + deltaMs;
    if (newSustained >= _smileSustainMs) {
      return SmileDetectorState(
        state: SmileState.passed,
        elapsedMs: newElapsed,
        sustainedMs: newSustained,
      );
    }
    return SmileDetectorState(
      state: SmileState.waiting,
      elapsedMs: newElapsed,
      sustainedMs: newSustained,
    );
  }

  // Smile dropped — reset sustained counter.
  return SmileDetectorState(
    state: SmileState.waiting,
    elapsedMs: newElapsed,
    sustainedMs: 0,
  );
}

import 'dart:math';

import '../ml/face_detector_service.dart';
import 'blink_detector.dart';
import 'head_turn_detector.dart';
import 'smile_detector.dart';

/// Types of liveness challenges.
enum ChallengeType {
  blink,
  headLeft,
  headRight,
  smile,
}

/// Overall challenge session status.
enum ChallengeStatus {
  active,
  passed,
  failed,
}

/// Immutable state of the full challenge engine.
class ChallengeState {
  final List<ChallengeType> sequence;
  final int currentIndex;
  final ChallengeStatus status;
  final bool retried;
  final int challengeStartMs;

  // Sub-state machines (only one is active at a time).
  final BlinkDetectorState? blinkState;
  final HeadTurnDetectorState? headTurnState;
  final SmileDetectorState? smileState;

  const ChallengeState({
    required this.sequence,
    required this.currentIndex,
    required this.status,
    this.retried = false,
    this.challengeStartMs = 0,
    this.blinkState,
    this.headTurnState,
    this.smileState,
  });

  ChallengeState copyWith({
    List<ChallengeType>? sequence,
    int? currentIndex,
    ChallengeStatus? status,
    bool? retried,
    int? challengeStartMs,
    BlinkDetectorState? blinkState,
    HeadTurnDetectorState? headTurnState,
    SmileDetectorState? smileState,
  }) {
    return ChallengeState(
      sequence: sequence ?? this.sequence,
      currentIndex: currentIndex ?? this.currentIndex,
      status: status ?? this.status,
      retried: retried ?? this.retried,
      challengeStartMs: challengeStartMs ?? this.challengeStartMs,
      blinkState: blinkState ?? this.blinkState,
      headTurnState: headTurnState ?? this.headTurnState,
      smileState: smileState ?? this.smileState,
    );
  }
}

/// Generate a random sequence of 3 unique challenges from the 4 types.
List<ChallengeType> generateSequence({Random? random}) {
  final rng = random ?? Random();
  final all = List<ChallengeType>.from(ChallengeType.values);
  all.shuffle(rng);
  return all.take(3).toList();
}

/// Initialize the challenge engine state with a fresh random sequence.
ChallengeState initChallengeState({Random? random}) {
  final seq = generateSequence(random: random);
  return ChallengeState(
    sequence: seq,
    currentIndex: 0,
    status: ChallengeStatus.active,
    blinkState: seq[0] == ChallengeType.blink ? initBlinkState() : null,
    headTurnState: seq[0] == ChallengeType.headLeft
        ? initHeadTurnState(TurnDirection.left)
        : seq[0] == ChallengeType.headRight
            ? initHeadTurnState(TurnDirection.right)
            : null,
    smileState: seq[0] == ChallengeType.smile ? initSmileState() : null,
  );
}

/// Get the currently active challenge, or null if complete/failed.
ChallengeType? currentChallenge(ChallengeState state) {
  if (state.status != ChallengeStatus.active) return null;
  if (state.currentIndex >= state.sequence.length) return null;
  return state.sequence[state.currentIndex];
}

/// Pure function: advance the challenge engine based on face data.
///
/// [state] — current engine state.
/// [faceData] — latest face detection result (or null if face lost).
/// [deltaMs] — milliseconds since last update.
ChallengeState updateChallenge(
  ChallengeState state,
  DetectedFaceData? faceData,
  int deltaMs,
) {
  // Terminal states.
  if (state.status != ChallengeStatus.active) return state;

  final challenge = currentChallenge(state);
  if (challenge == null) return state;

  // If face is lost, we still tick the clock — the sub-detectors handle timeout.
  final leftEye = faceData?.leftEyeOpenProbability;
  final rightEye = faceData?.rightEyeOpenProbability;
  final smile = faceData?.smilingProbability;
  final yaw = faceData?.headEulerAngleY;

  switch (challenge) {
    case ChallengeType.blink:
      final updated = updateBlinkState(
        state.blinkState ?? initBlinkState(),
        leftEye,
        rightEye,
        deltaMs,
      );
      if (updated.state == BlinkState.passed) {
        return _advanceToNext(state.copyWith(blinkState: updated));
      }
      if (updated.state == BlinkState.failed) {
        return _handleFailure(state.copyWith(blinkState: updated));
      }
      return state.copyWith(blinkState: updated);

    case ChallengeType.headLeft:
      final updated = detectHeadTurn(
        state.headTurnState ?? initHeadTurnState(TurnDirection.left),
        yaw,
        deltaMs,
      );
      if (updated.state == HeadTurnState.passed) {
        return _advanceToNext(state.copyWith(headTurnState: updated));
      }
      if (updated.state == HeadTurnState.failed) {
        return _handleFailure(state.copyWith(headTurnState: updated));
      }
      return state.copyWith(headTurnState: updated);

    case ChallengeType.headRight:
      final updated = detectHeadTurn(
        state.headTurnState ?? initHeadTurnState(TurnDirection.right),
        yaw,
        deltaMs,
      );
      if (updated.state == HeadTurnState.passed) {
        return _advanceToNext(state.copyWith(headTurnState: updated));
      }
      if (updated.state == HeadTurnState.failed) {
        return _handleFailure(state.copyWith(headTurnState: updated));
      }
      return state.copyWith(headTurnState: updated);

    case ChallengeType.smile:
      final updated = detectSmile(
        state.smileState ?? initSmileState(),
        smile,
        deltaMs,
      );
      if (updated.state == SmileState.passed) {
        return _advanceToNext(state.copyWith(smileState: updated));
      }
      if (updated.state == SmileState.failed) {
        return _handleFailure(state.copyWith(smileState: updated));
      }
      return state.copyWith(smileState: updated);
  }
}

/// Advance to the next challenge in the sequence.
ChallengeState _advanceToNext(ChallengeState state) {
  final nextIndex = state.currentIndex + 1;
  if (nextIndex >= state.sequence.length) {
    // All challenges passed.
    return state.copyWith(
      currentIndex: nextIndex,
      status: ChallengeStatus.passed,
    );
  }

  final nextChallenge = state.sequence[nextIndex];
  return ChallengeState(
    sequence: state.sequence,
    currentIndex: nextIndex,
    status: ChallengeStatus.active,
    retried: state.retried,
    challengeStartMs: 0,
    blinkState: nextChallenge == ChallengeType.blink ? initBlinkState() : null,
    headTurnState: nextChallenge == ChallengeType.headLeft
        ? initHeadTurnState(TurnDirection.left)
        : nextChallenge == ChallengeType.headRight
            ? initHeadTurnState(TurnDirection.right)
            : null,
    smileState: nextChallenge == ChallengeType.smile ? initSmileState() : null,
  );
}

/// Handle a challenge failure — allow one retry of the entire sequence.
ChallengeState _handleFailure(ChallengeState state) {
  if (!state.retried) {
    // Retry: regenerate sequence and start over.
    final newSeq = generateSequence();
    return ChallengeState(
      sequence: newSeq,
      currentIndex: 0,
      status: ChallengeStatus.active,
      retried: true,
      challengeStartMs: 0,
      blinkState:
          newSeq[0] == ChallengeType.blink ? initBlinkState() : null,
      headTurnState: newSeq[0] == ChallengeType.headLeft
          ? initHeadTurnState(TurnDirection.left)
          : newSeq[0] == ChallengeType.headRight
              ? initHeadTurnState(TurnDirection.right)
              : null,
      smileState:
          newSeq[0] == ChallengeType.smile ? initSmileState() : null,
    );
  }

  // Already retried — final failure.
  return state.copyWith(status: ChallengeStatus.failed);
}

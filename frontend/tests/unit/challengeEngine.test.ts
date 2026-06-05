import {
  generateSequence,
  initChallengeState,
  updateChallenge,
  currentChallenge,
  type FaceData,
} from '../../src/ml/challenges/challengeEngine';
import {THRESHOLDS} from '../../src/ml/thresholds';

// Past the per-step timeout — derived from the threshold so the test can't go
// stale if CHALLENGE_STEP_TIMEOUT_MS is retuned.
const TIMED_OUT_MS = THRESHOLDS.CHALLENGE_STEP_TIMEOUT_MS + 1000;

describe('generateSequence', () => {
  it('returns exactly 3 challenges', () => {
    const seq = generateSequence();
    expect(seq).toHaveLength(3);
  });

  it('contains only valid challenge types', () => {
    const valid = new Set(['blink', 'head_left', 'head_right', 'smile']);
    for (let i = 0; i < 50; i++) {
      const seq = generateSequence();
      seq.forEach(c => expect(valid.has(c)).toBe(true));
    }
  });

  it('has no duplicates in a single sequence', () => {
    for (let i = 0; i < 50; i++) {
      const seq = generateSequence();
      expect(new Set(seq).size).toBe(3);
    }
  });

  it('produces different orderings over many runs', () => {
    const results = new Set<string>();
    for (let i = 0; i < 100; i++) {
      results.add(generateSequence().join(','));
    }
    expect(results.size).toBeGreaterThan(1);
  });
});

describe('initChallengeState', () => {
  it('starts active with index 0', () => {
    const state = initChallengeState();
    expect(state.status).toBe('active');
    expect(state.currentIndex).toBe(0);
    expect(state.sequence).toHaveLength(3);
  });
});

describe('updateChallenge', () => {
  const blinkFace: FaceData = {
    leftEyeOpenProbability: 0.1,
    rightEyeOpenProbability: 0.1,
    smilingProbability: 0,
    yawAngle: 0,
  };

  const openFace: FaceData = {
    leftEyeOpenProbability: 0.9,
    rightEyeOpenProbability: 0.9,
    smilingProbability: 0,
    yawAngle: 0,
  };

  it('does not modify a passed state', () => {
    const state = initChallengeState();
    const passed = {...state, status: 'passed' as const};
    const next = updateChallenge(passed, openFace, 16);
    expect(next.status).toBe('passed');
  });

  it('does not modify a failed state', () => {
    const state = initChallengeState();
    const failed = {...state, status: 'failed' as const};
    const next = updateChallenge(failed, openFace, 16);
    expect(next.status).toBe('failed');
  });

  it('advances index after completing a step', () => {
    const state = initChallengeState();
    // Force a blink sequence
    const forced = {
      ...state,
      sequence: ['blink' as const, 'smile' as const, 'head_left' as const],
    };
    // Close eyes
    let next = updateChallenge(forced, blinkFace, 16);
    // Open eyes → pass blink
    next = updateChallenge(next, openFace, 16);
    expect(next.currentIndex).toBe(1);
  });

  it('retries once on timeout before failing', () => {
    const state = initChallengeState();
    // Simulate timeout with no progress
    const timedOut = {
      ...state,
      challengeStartMs: Date.now() - TIMED_OUT_MS,
    };
    let next = updateChallenge(timedOut, openFace, 16);
    // First timeout → retry (retried = true)
    expect(next.status).toBe('active');
    expect(next.retried).toBe(true);

    // Second timeout → failed
    const timedOut2 = {
      ...next,
      challengeStartMs: Date.now() - TIMED_OUT_MS,
    };
    next = updateChallenge(timedOut2, openFace, 16);
    expect(next.status).toBe('failed');
  });
});

describe('currentChallenge', () => {
  it('returns null when not active', () => {
    const state = initChallengeState();
    expect(currentChallenge({...state, status: 'passed'})).toBeNull();
    expect(currentChallenge({...state, status: 'failed'})).toBeNull();
  });

  it('returns current challenge when active', () => {
    const state = initChallengeState();
    const challenge = currentChallenge(state);
    expect(challenge).toBe(state.sequence[0]);
  });
});

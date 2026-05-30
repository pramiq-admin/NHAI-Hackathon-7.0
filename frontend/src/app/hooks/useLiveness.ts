import {useState, useCallback, useRef, useEffect} from 'react';
import {
  initChallengeState,
  updateChallenge,
  currentChallenge,
  type ChallengeState,
  type ChallengeType,
  type FaceData,
  type SequenceStatus,
} from '../../ml/challenges/challengeEngine';
import {THRESHOLDS} from '../../ml/thresholds';

export type LivenessPhase = 'idle' | 'active' | 'passed' | 'failed';

export function useLiveness() {
  const [phase, setPhase] = useState<LivenessPhase>('idle');
  const [currentStep, setCurrentStep] = useState<ChallengeType | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [totalSteps, setTotalSteps] = useState(3);
  const [sequence, setSequence] = useState<ChallengeType[]>([]);
  const [faceLost, setFaceLost] = useState(false);
  const [latestYaw, setLatestYaw] = useState<number | null>(null);

  const stateRef = useRef<ChallengeState | null>(null);
  const lastUpdateRef = useRef(Date.now());
  const lastFaceSeenRef = useRef(Date.now());
  const faceLostTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearFaceLostTimer = useCallback(() => {
    if (faceLostTimerRef.current) {
      clearInterval(faceLostTimerRef.current);
      faceLostTimerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    const state = initChallengeState();
    stateRef.current = state;
    const now = Date.now();
    lastUpdateRef.current = now;
    // Give ML Kit 3 sec warmup grace before considering face "lost"
    lastFaceSeenRef.current = now + 3000;
    setFaceLost(false);
    setPhase('active');
    setSequence(state.sequence);
    setTotalSteps(state.sequence.length);
    setStepIndex(0);
    setCurrentStep(currentChallenge(state));

    clearFaceLostTimer();
    faceLostTimerRef.current = setInterval(() => {
      if (!stateRef.current || stateRef.current.status !== 'active') return;
      const gap = Date.now() - lastFaceSeenRef.current;
      if (gap > THRESHOLDS.FACE_LOST_TIMEOUT_MS) {
        setFaceLost(true);
      }
    }, 500);
  }, [clearFaceLostTimer]);

  const processFace = useCallback((face: FaceData) => {
    if (!stateRef.current || stateRef.current.status !== 'active') return;

    const now = Date.now();
    const deltaMs = now - lastUpdateRef.current;
    lastUpdateRef.current = now;
    lastFaceSeenRef.current = now;
    setFaceLost(false);
    setLatestYaw(face.yawAngle);

    const next = updateChallenge(stateRef.current, face, deltaMs);
    stateRef.current = next;

    setStepIndex(next.currentIndex);
    setCurrentStep(currentChallenge(next));

    if (next.status === 'passed') {
      setPhase('passed');
      clearFaceLostTimer();
    } else if (next.status === 'failed') {
      setPhase('failed');
      clearFaceLostTimer();
    }
  }, [clearFaceLostTimer]);

  const reset = useCallback(() => {
    clearFaceLostTimer();
    stateRef.current = null;
    setPhase('idle');
    setCurrentStep(null);
    setStepIndex(0);
    setSequence([]);
    setFaceLost(false);
    setLatestYaw(null);
  }, [clearFaceLostTimer]);

  useEffect(() => {
    return clearFaceLostTimer;
  }, [clearFaceLostTimer]);

  return {
    phase,
    currentStep,
    stepIndex,
    totalSteps,
    sequence,
    faceLost,
    latestYaw,
    start,
    processFace,
    reset,
  };
}

import {useState, useCallback, useRef} from 'react';
import {
  initChallengeState,
  updateChallenge,
  currentChallenge,
  type ChallengeState,
  type ChallengeType,
  type FaceData,
  type SequenceStatus,
} from '../../ml/challenges/challengeEngine';

export type LivenessPhase = 'idle' | 'active' | 'passed' | 'failed';

export function useLiveness() {
  const [phase, setPhase] = useState<LivenessPhase>('idle');
  const [currentStep, setCurrentStep] = useState<ChallengeType | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [totalSteps, setTotalSteps] = useState(3);
  const [sequence, setSequence] = useState<ChallengeType[]>([]);

  const stateRef = useRef<ChallengeState | null>(null);
  const lastUpdateRef = useRef(Date.now());

  const start = useCallback(() => {
    const state = initChallengeState();
    stateRef.current = state;
    lastUpdateRef.current = Date.now();
    setPhase('active');
    setSequence(state.sequence);
    setTotalSteps(state.sequence.length);
    setStepIndex(0);
    setCurrentStep(currentChallenge(state));
  }, []);

  const processFace = useCallback((face: FaceData) => {
    if (!stateRef.current || stateRef.current.status !== 'active') return;

    const now = Date.now();
    const deltaMs = now - lastUpdateRef.current;
    lastUpdateRef.current = now;

    const next = updateChallenge(stateRef.current, face, deltaMs);
    stateRef.current = next;

    setStepIndex(next.currentIndex);
    setCurrentStep(currentChallenge(next));

    if (next.status === 'passed') {
      setPhase('passed');
    } else if (next.status === 'failed') {
      setPhase('failed');
    }
  }, []);

  const reset = useCallback(() => {
    stateRef.current = null;
    setPhase('idle');
    setCurrentStep(null);
    setStepIndex(0);
    setSequence([]);
  }, []);

  return {
    phase,
    currentStep,
    stepIndex,
    totalSteps,
    sequence,
    start,
    processFace,
    reset,
  };
}

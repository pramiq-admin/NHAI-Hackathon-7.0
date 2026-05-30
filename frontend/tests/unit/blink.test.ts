import {initBlinkState, updateBlinkState} from '../../src/ml/challenges/blink';

describe('blink state machine', () => {
  it('starts in waiting_close', () => {
    expect(initBlinkState()).toBe('waiting_close');
  });

  it('stays waiting_close when eyes open', () => {
    const state = updateBlinkState('waiting_close', 0.9, 0.9, 0);
    expect(state).toBe('waiting_close');
  });

  it('transitions to waiting_open when eyes close', () => {
    const state = updateBlinkState('waiting_close', 0.1, 0.1, 100);
    expect(state).toBe('waiting_open');
  });

  it('passes when eyes reopen after closing', () => {
    let state = updateBlinkState('waiting_close', 0.1, 0.1, 100);
    expect(state).toBe('waiting_open');
    state = updateBlinkState(state, 0.9, 0.9, 200);
    expect(state).toBe('passed');
  });

  it('fails on timeout', () => {
    const state = updateBlinkState('waiting_close', 0.9, 0.9, 4000);
    expect(state).toBe('failed');
  });

  it('fails mid-challenge on timeout', () => {
    const state = updateBlinkState('waiting_open', 0.1, 0.1, 4000);
    expect(state).toBe('failed');
  });

  it('stays passed once passed', () => {
    expect(updateBlinkState('passed', 0.1, 0.1, 0)).toBe('passed');
  });

  it('stays failed once failed', () => {
    expect(updateBlinkState('failed', 0.9, 0.9, 0)).toBe('failed');
  });

  it('requires BOTH eyes to close', () => {
    const state = updateBlinkState('waiting_close', 0.1, 0.9, 100);
    expect(state).toBe('waiting_close');
  });

  it('requires BOTH eyes to reopen', () => {
    const state = updateBlinkState('waiting_open', 0.9, 0.1, 100);
    expect(state).toBe('waiting_open');
  });
});

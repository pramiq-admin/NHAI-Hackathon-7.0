/**
 * E2E test for enrollment + verification flow.
 * Requires Detox or Maestro configured with a running emulator.
 * Run: maestro test frontend/tests/e2e/enrollment_flow.e2e.ts
 */
import {by, device, element, expect} from 'detox';

describe('Enrollment → Verification E2E', () => {
  beforeAll(async () => {
    await device.launchApp({newInstance: true});
  });

  it('shows camera permission prompt on first launch', async () => {
    await expect(element(by.text('Allow'))).toBeVisible();
    await element(by.text('Allow')).tap();
  });

  it('navigates to enrollment screen', async () => {
    await element(by.id('btn-enroll')).tap();
    await expect(element(by.id('camera-preview'))).toBeVisible();
  });

  it('captures face and saves template', async () => {
    await waitFor(element(by.id('face-detected-indicator')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('btn-capture')).tap();
    await expect(element(by.text('Enrollment successful'))).toBeVisible();
  });

  it('navigates to verification screen', async () => {
    await element(by.id('btn-verify')).tap();
    await expect(element(by.id('camera-preview'))).toBeVisible();
  });

  it('completes liveness challenge', async () => {
    await waitFor(element(by.id('challenge-instruction')))
      .toBeVisible()
      .withTimeout(5000);
    // Liveness challenges require real face — in CI use mock camera feed
    await waitFor(element(by.id('liveness-passed')))
      .toBeVisible()
      .withTimeout(15000);
  });

  it('shows match result after verification', async () => {
    await waitFor(element(by.id('match-result')))
      .toBeVisible()
      .withTimeout(10000);
    await expect(element(by.id('match-score'))).toBeVisible();
  });

  it('queues attendance event for sync', async () => {
    await expect(element(by.id('sync-status'))).toExist();
  });
});

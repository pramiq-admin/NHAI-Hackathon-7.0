import {THRESHOLDS} from '../thresholds';

export type QualityResult = {
  passed: boolean;
  magnitude: number;
  reason?: string;
};

export function checkQuality(magnitude: number): QualityResult {
  if (magnitude < THRESHOLDS.QUALITY_MAGNITUDE) {
    return {
      passed: false,
      magnitude,
      reason: `Low quality (mag=${magnitude.toFixed(1)}, need>${THRESHOLDS.QUALITY_MAGNITUDE})`,
    };
  }
  return {passed: true, magnitude};
}

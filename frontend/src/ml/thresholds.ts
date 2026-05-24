export const THRESHOLDS = {
  // Face detection (YuNet)
  DETECTION_CONFIDENCE: 0.7,
  DETECTION_IOU_NMS: 0.3,

  // Face recognition (EdgeFace) — tuned in Phase 8
  MATCH_COSINE: 0.6,
  MATCH_REJECT: 0.4,

  // Anti-spoof (MiniFASNet) — tuned in Phase 8
  PAD_LIVENESS: 0.85,

  // MagFace quality gate
  QUALITY_MAGNITUDE: 18.0,

  // Liveness challenges
  EAR_BLINK_CLOSED: 0.18,
  EAR_BLINK_OPEN: 0.25,
  BLINK_DURATION_MS: 500,
  YAW_TURN_DEG: 25,
  YAW_CENTER_DEG: 10,
  MAR_SMILE: 0.5,
  SMILE_DURATION_MS: 300,
  CHALLENGE_STEP_TIMEOUT_MS: 3000,
  CHALLENGE_TOTAL_TIMEOUT_MS: 8000,

  // Adaptive threshold (Phase 7)
  ADAPTIVE_MIN_SAMPLES: 20,
  ADAPTIVE_SIGMA_FACTOR: 2.0,
  ADAPTIVE_COLD_START: 0.6,
} as const;

# NHAI Face Auth — Device Benchmarks

**Device:** [fill: model, SoC, RAM]  
**Android Version:** [fill]  
**Date:** [fill]  
**Models:** YuNet INT8, EdgeFace-XS INT8, MiniFASNet V2+V1SE

---

## End-to-End Latency (ms)

| Condition | p50 | p95 | Target |
|-----------|-----|-----|--------|
| Indoor flat light | — | — | < 800 |
| Harsh sunlight (noon) | — | — | < 800 |
| Low light (dusk) | — | — | < 800 |
| Backlit | — | — | < 800 |

## Per-Stage Latency (ms, p50)

| Stage | Indoor | Sunlight | Low Light | Backlit |
|-------|--------|----------|-----------|---------|
| Detection (YuNet) | — | — | — | — |
| Embedding (EdgeFace) | — | — | — | — |
| Vector Match | — | — | — | — |
| Liveness (3 challenges) | — | — | — | — |
| Anti-Spoof (MiniFASNet) | — | — | — | — |

## Recognition Accuracy (TAR @ FAR=1e-3)

| Condition | TAR | Target |
|-----------|-----|--------|
| Indoor flat light | — | >= 95% |
| Harsh sunlight | — | >= 88% |
| Low light | — | >= 90% |
| With helmet | — | Document |
| With sunglasses | — | Document |

## PAD Attack Matrix

| Attack | Blocked? | PAD Score | Notes |
|--------|----------|-----------|-------|
| Printed A4 photo | — | — | |
| Phone screen (static) | — | — | |
| Phone screen (video loop) | — | — | |
| Paper mask | — | — | |

## Liveness Challenge Pass Rate

| Challenge | Pass Rate | Avg Time (s) |
|-----------|-----------|--------------|
| Blink | — | — |
| Head Left | — | — |
| Head Right | — | — |
| Smile | — | — |

## Battery Profile

| Metric | Value | Target |
|--------|-------|--------|
| Drain per 100 verifications | — | < 5% |
| Thermal throttle observed? | — | No |

## Threshold Tuning Results

| Parameter | Before | After | Rationale |
|-----------|--------|-------|-----------|
| MATCH_COSINE | 0.6 | — | |
| PAD_LIVENESS | 0.5 | — | |
| DETECTION_CONFIDENCE | 0.7 | — | |
| EYE_CLOSED_THRESHOLD | 0.3 | — | |

## Notes

- [fill after field testing sessions]

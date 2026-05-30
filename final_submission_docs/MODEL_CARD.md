# Model Card — EdgeFace-XS (Indian Fine-Tuned)

## Overview

| Field | Value |
|-------|-------|
| Base Model | EdgeFace-XS (edgenext_x_small + LoRA γ=0.6) |
| Fine-Tune Data | IndicFairFace + IMFDB + JFAD |
| Task | Face verification (1:N embedding match) |
| Input | 112×112 RGB face crop |
| Output | 512-dim L2-normalized embedding |
| Quantization | INT8 via litert_torch |
| On-Device Size | ~1.8 MB |
| Target Hardware | Android (NNAPI) / iOS (CoreML ANE) |

## Training

- **Backbone freeze:** All layers except stages.2, stages.3, head, norm
- **Head:** ArcFace (s=64, m=0.5)
- **Optimizer:** AdamW, LR=1e-4, weight decay=0.05
- **Schedule:** Cosine annealing over 30 epochs
- **Batch size:** 128 on T4 GPU
- **Augmentation:** RandomResizedCrop, HorizontalFlip, ColorJitter, RandomGrayscale

## Accuracy

> Fill after training completes.

### Indian Validation Set (TAR @ FAR=1e-4)

| Metric | Stock | Fine-Tuned | Target |
|--------|-------|------------|--------|
| Overall | — | — | ≥ 95% |

### DFW Disguise Subsets (TAR @ FAR=1e-4)

| Disguise | Stock | Fine-Tuned | Target |
|----------|-------|------------|--------|
| Helmet | — | — | ≥ 80% |
| Sunglasses | — | — | ≥ 80% |
| Mask | — | — | ≥ 80% |
| Overall | — | — | ≥ 80% |

### LFW Sanity Check

| Metric | Stock | Fine-Tuned | Target |
|--------|-------|------------|--------|
| Accuracy | 99.x% | — | ≥ 99.0% |

### INT8 Quantization Error

| Metric | Value | Target |
|--------|-------|--------|
| Mean cosine error (FP32 vs INT8) | — | < 1% |

## Demographic Fairness

> Report accuracy per demographic slice from IndicFairFace metadata.

| Demographic | N | TAR @ FAR=1e-4 |
|-------------|---|-----------------|
| — | — | — |

## Limitations

- Fine-tuned on available Indian datasets only; may not generalize to all Indian demographics
- Highway field conditions (dust, glare, helmet shadows) not fully represented in training data
- INT8 quantization introduces small accuracy loss vs FP32

## Intended Use

On-device face authentication for NHAI toll plaza workers. Not intended for mass surveillance or law enforcement identification.

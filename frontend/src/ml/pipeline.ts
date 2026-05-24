import {THRESHOLDS} from './thresholds';
import {checkQuality} from './processors/qualityGate';
import {findBestMatch, setTemplates, getTemplateCount} from '../storage/vectorMatch';
import type {MatchResult, Template} from '../storage/vectorMatch';
import {getAllTemplates} from '../storage/db/templates.repo';
import {insertTemplate} from '../storage/db/templates.repo';
import {bioHash, generateSalt} from '../storage/crypto/bioHash';

export type PipelineResult = {
  stage: 'no_face' | 'low_quality' | 'no_templates' | 'matched' | 'no_match' | 'enrolled';
  match?: MatchResult;
  quality?: {magnitude: number; passed: boolean; reason?: string};
  embeddingLatencyMs?: number;
};

let initialized = false;

export function initPipeline(): void {
  if (initialized) return;
  const templates = getAllTemplates();
  setTemplates(templates);
  initialized = true;
}

export function reloadTemplates(): number {
  const templates = getAllTemplates();
  setTemplates(templates);
  return templates.length;
}

export function processEmbedding(
  embedding: number[],
  magnitude: number,
  latencyMs: number,
): PipelineResult {
  const quality = checkQuality(magnitude);
  if (!quality.passed) {
    return {
      stage: 'low_quality',
      quality,
      embeddingLatencyMs: latencyMs,
    };
  }

  if (getTemplateCount() === 0) {
    return {
      stage: 'no_templates',
      quality,
      embeddingLatencyMs: latencyMs,
    };
  }

  const match = findBestMatch(embedding, THRESHOLDS.MATCH_COSINE);
  if (match) {
    return {
      stage: 'matched',
      match,
      quality,
      embeddingLatencyMs: latencyMs,
    };
  }

  return {
    stage: 'no_match',
    quality,
    embeddingLatencyMs: latencyMs,
  };
}

export function enrollFace(
  userId: string,
  name: string,
  embedding: number[],
): {id: string; bioHashStored: boolean} {
  const salt = generateSalt();
  const hash = bioHash(embedding, salt);

  const id = insertTemplate(userId, name, embedding, hash, salt);
  reloadTemplates();

  return {id, bioHashStored: true};
}

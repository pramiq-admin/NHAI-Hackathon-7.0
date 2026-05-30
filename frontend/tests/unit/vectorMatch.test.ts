import {
  cosineSimilarity,
  findBestMatch,
  setTemplates,
  getTemplateCount,
} from '../../src/storage/vectorMatch';

describe('cosineSimilarity', () => {
  it('returns 1 for identical normalized vectors', () => {
    const v = [0.6, 0.8];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0, 5);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5);
  });

  it('returns -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 5);
  });

  it('handles high-dimensional vectors', () => {
    const a = Array.from({length: 512}, (_, i) => Math.sin(i));
    const norm = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
    const normalized = a.map(v => v / norm);
    expect(cosineSimilarity(normalized, normalized)).toBeCloseTo(1.0, 4);
  });
});

describe('findBestMatch', () => {
  beforeEach(() => {
    setTemplates([
      {id: '1', userId: 'U1', name: 'Alice', embedding: [1, 0, 0]},
      {id: '2', userId: 'U2', name: 'Bob', embedding: [0, 1, 0]},
      {id: '3', userId: 'U3', name: 'Charlie', embedding: [0, 0, 1]},
    ]);
  });

  afterEach(() => setTemplates([]));

  it('matches exact embedding above threshold', () => {
    const result = findBestMatch([1, 0, 0], 0.5);
    expect(result).not.toBeNull();
    expect(result!.userId).toBe('U1');
    expect(result!.name).toBe('Alice');
    expect(result!.score).toBeCloseTo(1.0);
  });

  it('returns null when below threshold', () => {
    const result = findBestMatch([0.5, 0.5, 0.5], 0.95);
    expect(result).toBeNull();
  });

  it('picks highest scoring match', () => {
    const result = findBestMatch([0.9, 0.1, 0], 0.5);
    expect(result).not.toBeNull();
    expect(result!.userId).toBe('U1');
  });

  it('returns null with empty template cache', () => {
    setTemplates([]);
    expect(findBestMatch([1, 0, 0], 0.5)).toBeNull();
  });

  it('uses per-user threshold when provided', () => {
    const getUserThreshold = (userId: string) => (userId === 'U1' ? 0.99 : 0.5);
    const result = findBestMatch([0.95, 0.05, 0], 0.5, getUserThreshold);
    expect(result).toBeNull();
  });

  it('falls back to global threshold without getUserThreshold', () => {
    const result = findBestMatch([0.95, 0.05, 0], 0.5);
    expect(result).not.toBeNull();
  });
});

describe('getTemplateCount', () => {
  it('returns 0 when empty', () => {
    setTemplates([]);
    expect(getTemplateCount()).toBe(0);
  });

  it('returns correct count', () => {
    setTemplates([
      {id: '1', userId: 'U1', name: 'A', embedding: [1]},
      {id: '2', userId: 'U2', name: 'B', embedding: [0]},
    ]);
    expect(getTemplateCount()).toBe(2);
    setTemplates([]);
  });
});

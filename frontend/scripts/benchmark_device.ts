/**
 * On-device benchmark runner for NHAI Face Auth.
 * Captures per-stage timing over N verification cycles and exports JSON results.
 *
 * Usage (from RN app): import and call runBenchmark() from AdminScreen or a debug button.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const BENCHMARK_KEY = '@nhai_benchmark_results';

export interface StageTimings {
  detectionMs: number;
  embeddingMs: number;
  matchMs: number;
  livenessMs: number;
  antiSpoofMs: number;
  totalMs: number;
}

export interface BenchmarkRun {
  index: number;
  timestamp: string;
  matched: boolean;
  userId: string | null;
  cosineScore: number | null;
  timings: StageTimings;
  condition: string;
}

export interface BenchmarkReport {
  device: string;
  date: string;
  condition: string;
  runs: BenchmarkRun[];
  summary: {
    totalRuns: number;
    matchedCount: number;
    tar: number;
    latencyP50Ms: number;
    latencyP95Ms: number;
    detectionP50Ms: number;
    embeddingP50Ms: number;
    matchP50Ms: number;
    avgCosineScore: number;
  };
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

export function computeSummary(
  runs: BenchmarkRun[],
  condition: string,
  device: string,
): BenchmarkReport {
  const totalLatencies = runs.map(r => r.timings.totalMs);
  const detLatencies = runs.map(r => r.timings.detectionMs);
  const embLatencies = runs.map(r => r.timings.embeddingMs);
  const matchedRuns = runs.filter(r => r.matched);
  const cosineScores = matchedRuns
    .map(r => r.cosineScore)
    .filter((s): s is number => s !== null);

  return {
    device,
    date: new Date().toISOString().split('T')[0],
    condition,
    runs,
    summary: {
      totalRuns: runs.length,
      matchedCount: matchedRuns.length,
      tar: runs.length > 0 ? matchedRuns.length / runs.length : 0,
      latencyP50Ms: percentile(totalLatencies, 50),
      latencyP95Ms: percentile(totalLatencies, 95),
      detectionP50Ms: percentile(detLatencies, 50),
      embeddingP50Ms: percentile(embLatencies, 50),
      matchP50Ms: percentile(runs.map(r => r.timings.matchMs), 50),
      avgCosineScore:
        cosineScores.length > 0
          ? cosineScores.reduce((a, b) => a + b, 0) / cosineScores.length
          : 0,
    },
  };
}

export async function saveBenchmarkReport(report: BenchmarkReport): Promise<void> {
  const raw = await AsyncStorage.getItem(BENCHMARK_KEY);
  const existing: BenchmarkReport[] = raw ? JSON.parse(raw) : [];
  existing.push(report);
  await AsyncStorage.setItem(BENCHMARK_KEY, JSON.stringify(existing));
}

export async function getAllBenchmarkReports(): Promise<BenchmarkReport[]> {
  const raw = await AsyncStorage.getItem(BENCHMARK_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function exportBenchmarkJSON(): Promise<string> {
  const reports = await getAllBenchmarkReports();
  return JSON.stringify(reports, null, 2);
}

export async function clearBenchmarks(): Promise<void> {
  await AsyncStorage.removeItem(BENCHMARK_KEY);
}

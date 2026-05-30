import {apiFetch} from './httpClient';

export type PunchEventDTO = {
  id: string;
  type: 'in' | 'out';
  timestamp: string; // ISO
  gps_lat?: number | null;
  gps_lon?: number | null;
  gps_accuracy?: number | null;
  face_match_score?: number | null;
  liveness_passed?: boolean;
  device_id?: string | null;
};

export type PunchEventOut = {
  id: string;
  worker_id: string;
  type: 'in' | 'out';
  timestamp: string;
  gps_lat: number | null;
  gps_lon: number | null;
  face_match_score: number | null;
  liveness_passed: boolean;
  created_at: string;
};

export type AttendanceSummaryDay = {
  date: string;
  punch_in: string | null;
  punch_out: string | null;
  duration_minutes: number | null;
  status: 'full' | 'partial' | 'absent';
};

export async function syncPunchEvents(events: PunchEventDTO[]): Promise<{
  accepted: string[];
  rejected: string[];
}> {
  return apiFetch('/api/v1/punch/sync', {
    method: 'POST',
    body: {events},
  });
}

export async function fetchMyPunches(opts?: {
  date_from?: string;
  date_to?: string;
  limit?: number;
}): Promise<PunchEventOut[]> {
  const qs = new URLSearchParams();
  if (opts?.date_from) qs.set('date_from', opts.date_from);
  if (opts?.date_to) qs.set('date_to', opts.date_to);
  if (opts?.limit) qs.set('limit', String(opts.limit));
  const q = qs.toString();
  return apiFetch(`/api/v1/punch/me${q ? '?' + q : ''}`);
}

export async function fetchWorkerPunches(
  workerId: string,
  opts?: {date_from?: string; date_to?: string; limit?: number},
): Promise<PunchEventOut[]> {
  const qs = new URLSearchParams();
  if (opts?.date_from) qs.set('date_from', opts.date_from);
  if (opts?.date_to) qs.set('date_to', opts.date_to);
  if (opts?.limit) qs.set('limit', String(opts.limit));
  const q = qs.toString();
  return apiFetch(`/api/v1/punch/worker/${workerId}${q ? '?' + q : ''}`);
}

export async function fetchAttendanceSummary(
  workerId: string,
  month: string, // YYYY-MM
): Promise<AttendanceSummaryDay[]> {
  return apiFetch(`/api/v1/punch/summary/${workerId}?month=${month}`);
}

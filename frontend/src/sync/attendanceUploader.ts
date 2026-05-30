import {api} from './apiClient';

export interface AttendanceEvent {
  event_id: string;
  user_id: string;
  user_name: string;
  device_id: string;
  timestamp: string;
  cosine_score: number;
  liveness_passed: boolean;
  pad_score?: number;
  latency_ms?: number;
  gps_lat?: number;
  gps_lon?: number;
  notes?: string;
  bio_hash_verified?: boolean;
  bio_hash_distance?: number;
}

export interface SyncResult {
  accepted: string[];
  rejected: string[];
  server_ack: string;
}

const BATCH_SIZE = 50;

export async function uploadAttendanceBatch(
  events: AttendanceEvent[],
): Promise<SyncResult> {
  const batches: AttendanceEvent[][] = [];
  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    batches.push(events.slice(i, i + BATCH_SIZE));
  }

  const allAccepted: string[] = [];
  const allRejected: string[] = [];
  let lastAck = '';

  for (const batch of batches) {
    const res = await api.post<SyncResult>('/attendance', {events: batch});
    allAccepted.push(...res.data.accepted);
    allRejected.push(...res.data.rejected);
    lastAck = res.data.server_ack;
  }

  return {accepted: allAccepted, rejected: allRejected, server_ack: lastAck};
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import {uploadAttendanceBatch, type AttendanceEvent} from './attendanceUploader';
import {withRetry} from './retryPolicy';

const QUEUE_KEY = '@nhai_sync_queue';

export async function enqueueEvent(event: AttendanceEvent): Promise<void> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  let queue: AttendanceEvent[] = [];
  try {
    queue = raw ? JSON.parse(raw) : [];
  } catch {}
  queue.push(event);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function getQueueSize(): Promise<number> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  try {
    return raw ? JSON.parse(raw).length : 0;
  } catch {
    return 0;
  }
}

export async function syncPendingEvents(): Promise<{
  synced: number;
  failed: boolean;
}> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return {synced: 0, failed: false};

  let queue: AttendanceEvent[];
  try {
    queue = JSON.parse(raw);
  } catch {
    await AsyncStorage.removeItem(QUEUE_KEY);
    return {synced: 0, failed: false};
  }
  if (queue.length === 0) return {synced: 0, failed: false};

  try {
    const result = await withRetry(() => uploadAttendanceBatch(queue));

    const processedSet = new Set([...result.accepted, ...result.rejected]);
    const remaining = queue.filter(e => !processedSet.has(e.event_id));
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));

    return {synced: result.accepted.length, failed: false};
  } catch {
    return {synced: 0, failed: true};
  }
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

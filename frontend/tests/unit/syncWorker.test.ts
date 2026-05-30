import AsyncStorage from '@react-native-async-storage/async-storage';
import {enqueueEvent, getQueueSize, syncPendingEvents, clearQueue} from '../../src/sync/syncWorker';
import type {AttendanceEvent} from '../../src/sync/attendanceUploader';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('../../src/sync/attendanceUploader', () => ({
  uploadAttendanceBatch: jest.fn(),
}));

jest.mock('../../src/sync/retryPolicy', () => ({
  withRetry: (fn: () => Promise<unknown>) => fn(),
}));

const mockStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const {uploadAttendanceBatch} = require('../../src/sync/attendanceUploader');

beforeEach(() => jest.clearAllMocks());

const makeEvent = (id: string): AttendanceEvent => ({
  event_id: id,
  user_id: 'U1',
  user_name: 'Test',
  device_id: 'dev',
  timestamp: '2026-05-24T10:00:00Z',
  cosine_score: 0.85,
  liveness_passed: true,
});

describe('enqueueEvent', () => {
  it('adds event to empty queue', async () => {
    mockStorage.getItem.mockResolvedValue(null);
    await enqueueEvent(makeEvent('e1'));
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      '@nhai_sync_queue',
      expect.stringContaining('e1'),
    );
  });

  it('appends to existing queue', async () => {
    mockStorage.getItem.mockResolvedValue(JSON.stringify([makeEvent('e1')]));
    await enqueueEvent(makeEvent('e2'));
    const saved = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    expect(saved).toHaveLength(2);
  });
});

describe('getQueueSize', () => {
  it('returns 0 for empty queue', async () => {
    mockStorage.getItem.mockResolvedValue(null);
    expect(await getQueueSize()).toBe(0);
  });

  it('returns correct count', async () => {
    mockStorage.getItem.mockResolvedValue(JSON.stringify([makeEvent('e1'), makeEvent('e2')]));
    expect(await getQueueSize()).toBe(2);
  });
});

describe('syncPendingEvents', () => {
  it('returns synced=0 for empty queue', async () => {
    mockStorage.getItem.mockResolvedValue(null);
    const result = await syncPendingEvents();
    expect(result).toEqual({synced: 0, failed: false});
  });

  it('syncs events and purges accepted+rejected', async () => {
    const events = [makeEvent('e1'), makeEvent('e2')];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(events));
    uploadAttendanceBatch.mockResolvedValue({
      accepted: ['e1'],
      rejected: ['e2'],
      server_ack: 'abc',
    });

    const result = await syncPendingEvents();
    expect(result.synced).toBe(1);
    expect(result.failed).toBe(false);
    const remaining = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    expect(remaining).toHaveLength(0);
  });

  it('returns failed=true on network error', async () => {
    mockStorage.getItem.mockResolvedValue(JSON.stringify([makeEvent('e1')]));
    uploadAttendanceBatch.mockRejectedValue(new Error('network'));

    const result = await syncPendingEvents();
    expect(result.failed).toBe(true);
    expect(result.synced).toBe(0);
  });
});

describe('clearQueue', () => {
  it('removes queue from storage', async () => {
    await clearQueue();
    expect(mockStorage.removeItem).toHaveBeenCalledWith('@nhai_sync_queue');
  });
});

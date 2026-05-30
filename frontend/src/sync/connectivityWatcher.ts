import NetInfo, {type NetInfoState} from '@react-native-community/netinfo';
import {syncPendingEvents} from './syncWorker';

let unsubscribe: (() => void) | null = null;

export function startConnectivityWatcher(): void {
  if (unsubscribe) return;

  unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
    if (state.isConnected && state.isInternetReachable) {
      syncPendingEvents().catch(() => {});
    }
  });
}

export function stopConnectivityWatcher(): void {
  unsubscribe?.();
  unsubscribe = null;
}

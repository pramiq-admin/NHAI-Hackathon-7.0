import React, {useEffect} from 'react';
import {AppState, type AppStateStatus} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import {ThemeProvider} from './src/app/theme/ThemeContext';
import RootStack from './src/app/navigation/RootStack';
import {
  startConnectivityWatcher,
  stopConnectivityWatcher,
} from './src/sync/connectivityWatcher';
import {syncPendingEvents} from './src/sync/syncWorker';
import {triggerPunchSync} from './src/sync/punchSyncWorker';
import {checkAndUpdateModel} from './src/ota/modelDownloader';
import {getOrCreateDbKey} from './src/storage/secure/dbKey';
import './src/i18n';

export default function App() {
  useEffect(() => {
    // Bootstrap the SQLCipher key BEFORE anything reads the DB. Sync workers
    // and the ML pipeline both open SQLite lazily, so resolving the key first
    // guarantees they open the encrypted file with the right master key.
    let mounted = true;
    (async () => {
      try {
        await getOrCreateDbKey();
      } catch (e) {
        console.warn('[App] dbKey bootstrap failed:', e);
      }
      if (!mounted) return;
      // Existing sync (legacy AttendanceEvent queue from VerificationScreen)
      startConnectivityWatcher();
      syncPendingEvents().catch(() => {});
      checkAndUpdateModel().catch(() => {});
      // Worker punch sync (new) — initial drain + on every reconnect
      triggerPunchSync().catch(() => {});
    })();
    const unsubNet = NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        triggerPunchSync().catch(() => {});
      }
    });

    // Also drain when the user brings the app back to the foreground after a
    // long pause (the screen-focus and NetInfo paths don't cover this if
    // connectivity didn't change).
    const handleAppState = (next: AppStateStatus) => {
      if (next === 'active') {
        triggerPunchSync().catch(() => {});
        syncPendingEvents().catch(() => {});
      }
    };
    const appStateSub = AppState.addEventListener('change', handleAppState);

    return () => {
      mounted = false;
      stopConnectivityWatcher();
      unsubNet();
      appStateSub.remove();
    };
  }, []);

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <RootStack />
        </NavigationContainer>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

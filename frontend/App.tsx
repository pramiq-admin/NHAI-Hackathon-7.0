import React, {useEffect} from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import {ThemeProvider} from './src/app/theme/ThemeContext';
import RootStack from './src/app/navigation/RootStack';
import {checkAndUpdateModel} from './src/ota/modelDownloader';
import {getOrCreateDbKey} from './src/storage/secure/dbKey';
import './src/i18n';

export default function App() {
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await getOrCreateDbKey();
      } catch (e) {
        console.warn('[App] dbKey bootstrap failed:', e);
      }
      if (!mounted) return;
      checkAndUpdateModel().catch(() => {});
    })();
    return () => {
      mounted = false;
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

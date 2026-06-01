// Central API host config (single source of truth for both httpClient & apiClient).
//
// Physical phone  → must point at the dev machine's LAN IP, and the phone must be
//                   on the SAME network and able to reach it (test in the phone's
//                   browser: http://<DEV_HOST>:8000/docs should open).
// Emulator/sim    → set DEV_HOST = '' to auto-use the platform loopback aliases.
import {Platform} from 'react-native';

// Full base URL override (e.g. a public tunnel like https://xxx.trycloudflare.com).
// Highest priority — set this and the APK works from ANY network. '' = disabled.
export const API_BASE_OVERRIDE = 'https://evidence-prefix-tool-syndrome.trycloudflare.com';

// Set to your computer's LAN IP for a physical device, or '' for emulator/simulator.
export const DEV_HOST = '155.117.40.181';

function resolveHost(): string {
  if (API_BASE_OVERRIDE) return API_BASE_OVERRIDE.replace(/\/+$/, '');
  if (DEV_HOST) return `http://${DEV_HOST}:8000`;
  // Android emulator → host loopback; iOS simulator → localhost
  return Platform.OS === 'android'
    ? 'http://10.0.2.2:8000'
    : 'http://localhost:8000';
}

export const API_HOST = resolveHost();

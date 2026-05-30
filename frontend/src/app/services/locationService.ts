import {Platform, PermissionsAndroid} from 'react-native';

export type LocationFix = {
  lat: number;
  lon: number;
  accuracy: number;
  timestamp: number;
};

export type LocationResult =
  | {ok: true; fix: LocationFix}
  | {ok: false; reason: 'denied' | 'timeout' | 'unavailable' | 'error'; message: string};

async function ensurePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location for Attendance',
        message: 'Location is captured at punch-in/out to verify on-site attendance.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

/**
 * Best-effort GPS fix with 10-second timeout. Never throws — always returns a result.
 */
export async function getCurrentLocation(
  timeoutMs = 10000,
): Promise<LocationResult> {
  const hasPerm = await ensurePermission();
  if (!hasPerm) {
    return {ok: false, reason: 'denied', message: 'Location permission denied'};
  }

  let Geo: any;
  try {
    Geo = require('@react-native-community/geolocation').default;
  } catch (e) {
    return {ok: false, reason: 'unavailable', message: 'Geolocation module missing'};
  }

  return new Promise<LocationResult>(resolve => {
    let settled = false;
    const finish = (r: LocationResult) => {
      if (settled) return;
      settled = true;
      resolve(r);
    };

    const timer = setTimeout(
      () =>
        finish({
          ok: false,
          reason: 'timeout',
          message: 'GPS fix not obtained in time',
        }),
      timeoutMs + 500,
    );

    try {
      Geo.getCurrentPosition(
        (pos: any) => {
          clearTimeout(timer);
          finish({
            ok: true,
            fix: {
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
              accuracy: pos.coords.accuracy ?? 0,
              timestamp: pos.timestamp,
            },
          });
        },
        (err: any) => {
          clearTimeout(timer);
          finish({
            ok: false,
            reason: 'error',
            message: err?.message || 'GPS error',
          });
        },
        {enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 10000},
      );
    } catch (e: any) {
      clearTimeout(timer);
      finish({ok: false, reason: 'error', message: e?.message || 'GPS init failed'});
    }
  });
}

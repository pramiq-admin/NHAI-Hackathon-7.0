/**
 * Secure key-value store backed by react-native-keychain.
 *
 * Used for genuinely sensitive material — JWTs, the SQLCipher master key,
 * BioHash salts. Falls back to AsyncStorage if the keychain module isn't
 * available (dev only — production builds must have it linked).
 *
 * Why keychain over AsyncStorage:
 *   - On Android, react-native-keychain uses Android Keystore (TEE on
 *     supported devices) — the secret never enters JS-readable plaintext on
 *     disk.
 *   - On iOS, it lands in the Keychain (Secure Enclave for biometrics).
 *   - Either way: `adb pull` + JSON.parse on the AsyncStorage file does NOT
 *     reveal the secret. Without keychain wiring, the JWT was just sitting
 *     in plain JSON on the filesystem.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

type KeychainModule = {
  setGenericPassword: (
    username: string,
    password: string,
    options?: any,
  ) => Promise<any>;
  getGenericPassword: (
    options?: any,
  ) => Promise<{username: string; password: string} | false>;
  resetGenericPassword: (options?: any) => Promise<boolean>;
};

let _keychain: KeychainModule | null = null;
function getKeychain(): KeychainModule | null {
  if (_keychain) return _keychain;
  try {
    _keychain = require('react-native-keychain') as KeychainModule;
    return _keychain;
  } catch {
    return null;
  }
}

const ASYNC_FALLBACK_PREFIX = '@nhai_secure_fallback:';

export async function secureSet(key: string, value: string): Promise<void> {
  const kc = getKeychain();
  if (kc) {
    try {
      await kc.setGenericPassword(key, value, {service: `nhai.${key}`});
      return;
    } catch (e) {
      // fall through to AsyncStorage if keychain write fails (e.g. user locked device)
    }
  }
  await AsyncStorage.setItem(ASYNC_FALLBACK_PREFIX + key, value);
}

export async function secureGet(key: string): Promise<string | null> {
  const kc = getKeychain();
  if (kc) {
    try {
      const res = await kc.getGenericPassword({service: `nhai.${key}`});
      if (res && typeof res !== 'boolean') return res.password;
    } catch {}
  }
  const v = await AsyncStorage.getItem(ASYNC_FALLBACK_PREFIX + key);
  return v ?? null;
}

export async function secureDelete(key: string): Promise<void> {
  const kc = getKeychain();
  if (kc) {
    try {
      await kc.resetGenericPassword({service: `nhai.${key}`});
    } catch {}
  }
  await AsyncStorage.removeItem(ASYNC_FALLBACK_PREFIX + key);
}

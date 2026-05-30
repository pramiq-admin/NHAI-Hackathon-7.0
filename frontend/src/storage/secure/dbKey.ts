/**
 * SQLCipher master key derivation + storage.
 *
 * On first launch we generate a 32-byte random key and stash it in the
 * keychain (or AsyncStorage fallback). Every subsequent open reads the same
 * key. The on-disk SQLite file is then unreadable without it.
 *
 * Caveat: react-native-quick-sqlite must be the SQLCipher build to enforce
 * encryption — the standard build accepts the `key` option but ignores it
 * silently. Verify by trying to open the .db with the sqlite3 CLI; it
 * should fail with "file is not a database".
 */
import {secureGet, secureSet} from './secureStore';

const DB_KEY_KEY = 'sqlite_master_key';

let cachedKey: string | null = null;

function randomHex(byteLength: number): string {
  // Prefer libsodium for cryptographic randomness; fall back to Math.random
  // for the rare case where the module isn't linked (logs a loud warning).
  try {
    const libsodium = require('react-native-libsodium');
    const bytes: Uint8Array = libsodium.randombytes_buf(byteLength);
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    console.warn(
      '[secure/dbKey] libsodium unavailable, falling back to Math.random — ' +
        'DO NOT ship to production in this state',
    );
    let out = '';
    for (let i = 0; i < byteLength; i++) {
      out += Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
    }
    return out;
  }
}

/**
 * Returns the persistent SQLCipher key for this install, creating one on
 * first call. Synchronous-feeling cache after the first await.
 */
export async function getOrCreateDbKey(): Promise<string> {
  if (cachedKey) return cachedKey;
  const existing = await secureGet(DB_KEY_KEY);
  if (existing && existing.length >= 32) {
    cachedKey = existing;
    return existing;
  }
  const fresh = randomHex(32); // 64-hex-char = 256-bit key
  await secureSet(DB_KEY_KEY, fresh);
  cachedKey = fresh;
  return fresh;
}

/**
 * Synchronous getter for the cached key (after `getOrCreateDbKey` has been
 * awaited at least once). `null` until then. `dbClient.getDb()` opens lazily
 * — we await the key before its first call from `App.tsx`.
 */
export function getCachedDbKey(): string | null {
  return cachedKey;
}

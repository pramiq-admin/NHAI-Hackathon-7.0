import * as Keychain from 'react-native-keychain';

const SERVICE_NAME = 'nhai_face_auth_db_key';

export async function getOrCreateDbKey(): Promise<string> {
  const existing = await Keychain.getGenericPassword({service: SERVICE_NAME});
  if (existing && existing.password) {
    return existing.password;
  }

  const key = generateRandomKey(32);
  await Keychain.setGenericPassword('db_key', key, {
    service: SERVICE_NAME,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return key;
}

export async function storeSecret(
  key: string,
  value: string,
  service?: string,
): Promise<void> {
  await Keychain.setGenericPassword(key, value, {
    service: service ?? `nhai_${key}`,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function getSecret(
  key: string,
  service?: string,
): Promise<string | null> {
  const result = await Keychain.getGenericPassword({
    service: service ?? `nhai_${key}`,
  });
  if (result && result.password) {
    return result.password;
  }
  return null;
}

function generateRandomKey(length: number): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function toBase64(str: string): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;
  while (i < str.length) {
    const a = str.charCodeAt(i++);
    const b = i < str.length ? str.charCodeAt(i++) : 0;
    const c = i < str.length ? str.charCodeAt(i++) : 0;
    const triplet = (a << 16) | (b << 8) | c;
    result += chars[(triplet >> 18) & 0x3f];
    result += chars[(triplet >> 12) & 0x3f];
    result += i - 2 < str.length ? chars[(triplet >> 6) & 0x3f] : '=';
    result += i - 1 < str.length ? chars[triplet & 0x3f] : '=';
  }
  return result;
}

function fromBase64(encoded: string): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  const clean = encoded.replace(/=+$/, '');
  for (let i = 0; i < clean.length; i += 4) {
    const a = chars.indexOf(clean[i]);
    const b = chars.indexOf(clean[i + 1]);
    const c = i + 2 < clean.length ? chars.indexOf(clean[i + 2]) : 0;
    const d = i + 3 < clean.length ? chars.indexOf(clean[i + 3]) : 0;
    result += String.fromCharCode((a << 2) | (b >> 4));
    if (i + 2 < clean.length) result += String.fromCharCode(((b & 15) << 4) | (c >> 2));
    if (i + 3 < clean.length) result += String.fromCharCode(((c & 3) << 6) | d);
  }
  return result;
}

export function xorEncrypt(data: string, key: string): string {
  let encrypted = '';
  for (let i = 0; i < data.length; i++) {
    const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    encrypted += String.fromCharCode(charCode);
  }
  return toBase64(encrypted);
}

export function xorDecrypt(encoded: string, key: string): string {
  const encrypted = fromBase64(encoded);
  let decrypted = '';
  for (let i = 0; i < encrypted.length; i++) {
    const charCode = encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    decrypted += String.fromCharCode(charCode);
  }
  return decrypted;
}

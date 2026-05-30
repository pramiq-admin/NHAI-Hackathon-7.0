import SInfo from 'react-native-sensitive-info';
import {Buffer} from 'buffer';

const KEY_ALIAS = 'nhai_master_key';
const OPTIONS = {
  sharedPreferencesName: 'com.nhai.faceauth',
  keychainService: 'com.nhai.faceauth',
};

export async function getOrCreateMasterKey(): Promise<string> {
  try {
    const existing = await SInfo.getItem(KEY_ALIAS, OPTIONS);
    if (existing) return existing;
  } catch {}

  const randomBytes = new Uint8Array(32);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < 32; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const key = Buffer.from(randomBytes).toString('hex');

  await SInfo.setItem(KEY_ALIAS, key, OPTIONS);
  return key;
}

export async function deriveSqlCipherKey(): Promise<string> {
  const master = await getOrCreateMasterKey();
  return `x'${master}'`;
}

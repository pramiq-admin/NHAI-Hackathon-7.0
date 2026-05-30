import {Buffer} from 'buffer';

const BUNDLED_PUBLIC_KEY_B64 = 'qlTr13nY5NcmRoigNa6FSQ1+z8WSFlUxyKKkIYDmeNc=';

export async function verifyModelSignature(
  modelBytes: ArrayBuffer,
  signatureB64: string,
): Promise<boolean> {
  try {
    const crypto = require('react-native-libsodium');
    await crypto.ready;

    const publicKey = Buffer.from(BUNDLED_PUBLIC_KEY_B64, 'base64');
    const signature = Buffer.from(signatureB64, 'base64');
    const message = new Uint8Array(modelBytes);

    return crypto.crypto_sign_verify_detached(signature, message, publicKey);
  } catch (e: any) {
    console.error('[OTA Signature] Verification failed:', e?.message ?? e);
    return false;
  }
}

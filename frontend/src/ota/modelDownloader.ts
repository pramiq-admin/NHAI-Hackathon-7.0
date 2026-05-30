import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import {Buffer} from 'buffer';
import {verifyModelSignature} from './signatureVerifier';

const MODEL_VERSION_KEY = '@nhai_model_version';
const MODEL_DIR = `${RNFS.DocumentDirectoryPath}/models`;

export interface ModelUpdateResult {
  updated: boolean;
  version: string;
  error?: string;
}

async function getRemoteConfig(): Promise<{version: string; modelUrl: string; sigUrl: string} | null> {
  try {
    const remoteConfig = require('@react-native-firebase/remote-config').default;
    await remoteConfig().fetchAndActivate();
    const version = remoteConfig().getString('model_version');
    const modelUrl = remoteConfig().getString('model_url');
    const sigUrl = remoteConfig().getString('model_sig_url');
    if (!version || !modelUrl) return null;
    return {version, modelUrl, sigUrl};
  } catch {
    return null;
  }
}

export async function checkAndUpdateModel(): Promise<ModelUpdateResult> {
  const config = await getRemoteConfig();
  if (!config) return {updated: false, version: 'unknown', error: 'Remote config unavailable'};

  const currentVersion = await AsyncStorage.getItem(MODEL_VERSION_KEY);
  if (currentVersion === config.version) {
    return {updated: false, version: config.version};
  }

  try {
    await RNFS.mkdir(MODEL_DIR);

    const modelPath = `${MODEL_DIR}/edgeface_xs_latest.tflite`;
    const sigPath = `${MODEL_DIR}/edgeface_xs_latest.sig`;

    const modelDl = RNFS.downloadFile({fromUrl: config.modelUrl, toFile: modelPath});
    await modelDl.promise;

    if (config.sigUrl) {
      const sigDl = RNFS.downloadFile({fromUrl: config.sigUrl, toFile: sigPath});
      await sigDl.promise;

      const modelBytes = await RNFS.readFile(modelPath, 'base64');
      const sigContent = await RNFS.readFile(sigPath, 'utf8');

      const decoded = Buffer.from(modelBytes, 'base64');
      const buffer = decoded.buffer.slice(decoded.byteOffset, decoded.byteOffset + decoded.byteLength);
      const valid = await verifyModelSignature(buffer, sigContent.trim());

      if (!valid) {
        await RNFS.unlink(modelPath);
        await RNFS.unlink(sigPath);
        return {updated: false, version: config.version, error: 'Signature verification failed'};
      }
    }

    await AsyncStorage.setItem(MODEL_VERSION_KEY, config.version);
    return {updated: true, version: config.version};
  } catch (e: any) {
    return {updated: false, version: config.version, error: e.message};
  }
}

export async function getInstalledModelVersion(): Promise<string> {
  return (await AsyncStorage.getItem(MODEL_VERSION_KEY)) ?? 'bundled';
}

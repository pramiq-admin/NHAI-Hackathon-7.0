import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'http://10.0.2.2:8000/api/v1';
const SHARED_SECRET = 'nhai-hackathon-shared-secret';
const TOKEN_KEY = '@nhai_jwt';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {'Content-Type': 'application/json'},
});

async function getIntegrityToken(): Promise<string | null> {
  try {
    const {getIntegrityToken: fetchToken} = require('react-native-google-play-integrity');
    return await fetchToken();
  } catch {
    return null;
  }
}

api.interceptors.request.use(async (config: any) => {
  let token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const integrityToken = await getIntegrityToken();
  if (integrityToken) {
    config.headers['X-Integrity-Token'] = integrityToken;
  }
  return config;
});

api.interceptors.response.use(
  (res: any) => res,
  async (error: any) => {
    if (error.response?.status === 401) {
      const deviceId = (await AsyncStorage.getItem('@device_id')) ?? 'unknown';
      try {
        const res = await axios.post(`${API_BASE}/auth/token`, {
          device_id: deviceId,
          shared_secret: SHARED_SECRET,
        });
        const newToken = res.data.access_token;
        await AsyncStorage.setItem(TOKEN_KEY, newToken);

        error.config.headers.Authorization = `Bearer ${newToken}`;
        return axios(error.config);
      } catch {
        throw error;
      }
    }
    throw error;
  },
);

export {api, API_BASE};

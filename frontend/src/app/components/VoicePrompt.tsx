import {useEffect, useRef} from 'react';
import {useTranslation} from 'react-i18next';

let Tts: any = null;
let ttsInitialized = false;

function initTts() {
  if (ttsInitialized) return;
  ttsInitialized = true;

  try {
    Tts = require('react-native-tts').default;
    Tts.setDefaultRate(0.45);
    Tts.setDefaultPitch(1.0);
    Tts.setIgnoreSilentSwitch('ignore');

    Tts.getInitStatus()
      .then(() => {
        Tts.setDefaultLanguage('en-IN');
      })
      .catch(() => {});
  } catch {
    Tts = null;
  }
}

export function useVoicePrompt() {
  const {i18n} = useTranslation();
  const lastSpoken = useRef<string>('');

  useEffect(() => {
    initTts();
  }, []);

  useEffect(() => {
    if (!Tts) return;
    const lang = i18n.language === 'hi' ? 'hi-IN' : 'en-IN';
    Tts.setDefaultLanguage(lang).catch(() => {});
  }, [i18n.language]);

  const speak = (text: string, force = false) => {
    if (!Tts) return;
    if (!force && text === lastSpoken.current) return;
    lastSpoken.current = text;
    Tts.stop();
    Tts.speak(text);
  };

  const stop = () => {
    if (!Tts) return;
    Tts.stop();
    lastSpoken.current = '';
  };

  return {speak, stop};
}

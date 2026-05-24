import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';

import en from './locales/en.json';
import hi from './locales/hi.json';

let deviceLang = 'en';
try {
  const RNLocalize = require('react-native-localize');
  const locales = RNLocalize.getLocales();
  if (locales && locales.length > 0) {
    deviceLang = locales[0].languageCode;
  }
} catch {}

i18n.use(initReactI18next).init({
  resources: {
    en: {translation: en},
    hi: {translation: hi},
  },
  lng: deviceLang === 'hi' ? 'hi' : 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;

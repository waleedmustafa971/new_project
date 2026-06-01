import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './lang/en.json';
import ar from './lang/ar.json';
import hi from './lang/hi.json';
import bn from './lang/bn.json';

// Custom Language Detector
const languageDetector = {
  type: 'languageDetector',
  async: true,
  detect: async (callback) => {
    const savedLang = await AsyncStorage.getItem('user-language');
    if (savedLang) {
      callback(savedLang);
    } else {
      callback('en'); // default
    }
  },
  init: () => {},
  cacheUserLanguage: async (lng) => {
    await AsyncStorage.setItem('user-language', lng);
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    fallbackLng: 'en',
    resources: {
      en: { translation: en },
      ar: { translation: ar },
      hi: { translation: hi },
      bn: { translation: bn },
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;

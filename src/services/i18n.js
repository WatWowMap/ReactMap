// @ts-check

import { useFormatStore } from '@store/useFormatStore'
import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import Backend from 'i18next-http-backend'
import { initReactI18next } from 'react-i18next'

export default i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: CONFIG.client.locales || ['en'],
    fallbackLng: 'en',
    debug: false,
    joinArrays: '\n',
    lowerCaseLng: true,
    react: {},
    interpolation: {
      escapeValue: false,
    },
  })

i18n.on('languageChanged', (lng) => {
  useFormatStore.getState().setLocale(lng)
})

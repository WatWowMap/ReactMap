// @ts-check
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import Backend from 'i18next-http-backend'
import LanguageDetector from 'i18next-browser-languagedetector'
import { useFormatStore } from '@store/useFormatStore'

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
  })

i18n.on('languageChanged', (lng) => {
  useFormatStore.getState().setLocale(lng)
})

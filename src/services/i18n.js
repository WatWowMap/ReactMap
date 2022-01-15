import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import Backend from 'i18next-http-backend'
import LanguageDetector from 'i18next-browser-languagedetector'

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: ['en', 'de', 'nl', 'es', 'fr', 'it', 'ja', 'ko', 'pl', 'pt-br', 'ru', 'th', 'zh-tw'],
    fallbackLng: 'en',
    debug: false,
    joinArrays: '\n',
  })

export default i18n

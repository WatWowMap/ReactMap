import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import Backend from 'i18next-http-backend'
import LanguageDetector from 'i18next-browser-languagedetector'

const local = JSON.parse(localStorage.getItem('local-state'))

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: local ? local.state.settings.localeSelection : undefined,
    fallbackLng: 'en',
    debug: false,
  })

export default i18n

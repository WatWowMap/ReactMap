// @ts-check
import '@assets/css/main.css'
import 'leaflet.locatecontrol/dist/L.Control.Locate.css'
import 'leaflet/dist/leaflet.css'

import * as React from 'react'
import { BrowserRouter } from 'react-router-dom'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { ApolloProvider } from '@apollo/client'

import useCustomTheme from '@assets/mui/theme'
import { globalStyles } from '@assets/mui/global'
import { useStatic, useStore } from '@hooks/useStore'
import { apolloClient } from '@services/apollo'
import { isLocalStorageEnabled } from '@services/functions/isLocalStorageEnabled'
import { setLoadingText } from '@services/functions/setLoadingText'

import Config from './Config'
import ErrorBoundary from './ErrorBoundary'
import ReactRouter from './ReactRouter'
import HolidayEffects from './HolidayEffects'

/**
 * @type {Record<string, string>}
 */
const LOADING_LOCALES = {
  de: 'Übersetzungen werden geladen',
  en: 'Loading Translations',
  es: 'Cargando Traducciones',
  fr: 'Chargement des traductions',
  it: 'Caricamento Traduzioni',
  ja: '翻訳を読み込み中',
  ko: '번역 로드 중',
  nl: 'Vertalingen worden geladen',
  pl: 'Ładowanie tłumaczeń',
  'pt-br': 'Carregando Traduções',
  ru: 'Загрузка переводов',
  sv: 'Laddar Översättningar',
  th: 'กำลังโหลดการแปล',
  tr: 'Çeviriler Yükleniyor',
  'zh-tw': '載入翻譯',
}

function SetText() {
  const locale = localStorage?.getItem('i18nextLng') || 'en'
  setLoadingText(LOADING_LOCALES[locale.toLowerCase()] || LOADING_LOCALES.en)
  return <div />
}

/** @param {KeyboardEvent} event */
function toggleDarkMode(event) {
  // This is mostly meant for development purposes
  if (event.ctrlKey && event.key === 'd') {
    useStore.setState((prev) => ({ darkMode: !prev.darkMode }))
  }
}

window.addEventListener('keydown', toggleDarkMode)

window.addEventListener('online', () => useStatic.setState({ online: true }))

window.addEventListener('offline', () => useStatic.setState({ online: false }))

export default function App() {
  const theme = useCustomTheme()

  const isValid = isLocalStorageEnabled()

  if (!isValid) {
    setLoadingText('Local storage is required to use this app!')
  }

  return isValid ? (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <React.Suspense fallback={<SetText />}>
          {globalStyles}
          <ApolloProvider client={apolloClient}>
            <Config>
              <BrowserRouter>
                <ReactRouter />
              </BrowserRouter>
              <HolidayEffects />
            </Config>
          </ApolloProvider>
        </React.Suspense>
      </ErrorBoundary>
    </ThemeProvider>
  ) : null
}

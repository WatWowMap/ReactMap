// @ts-check
import '@assets/css/main.css'
import 'leaflet.locatecontrol/dist/L.Control.Locate.css'
import 'leaflet/dist/leaflet.css'

import * as React from 'react'
import { BrowserRouter } from 'react-router-dom'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { ApolloProvider } from '@apollo/client'

import customTheme from '@assets/mui/theme'
import { globalStyles } from '@assets/mui/global'
import { useStore } from '@hooks/useStore'
import apolloClient from '@services/apollo'
import { isLocalStorageEnabled } from '@services/functions/isLocalStorageEnabled'
import { setLoadingText } from '@services/functions/setLoadingText'

import Config from './Config'
import ErrorBoundary from './ErrorBoundary'

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

export default function App() {
  const [theme, setTheme] = React.useState(customTheme())

  React.useEffect(() => {
    window.addEventListener('keydown', toggleDarkMode)
    return () => window.removeEventListener('keydown', toggleDarkMode)
  }, [])

  const isValid = isLocalStorageEnabled()

  if (!isValid) {
    setLoadingText('Local storage is required to use this app!')
  }

  return isLocalStorageEnabled() ? (
    <ThemeProvider theme={theme}>
      <React.Suspense fallback={<SetText />}>
        <CssBaseline />
        {globalStyles}
        <ApolloProvider client={apolloClient}>
          <ErrorBoundary>
            <BrowserRouter>
              <Config setTheme={setTheme} />
            </BrowserRouter>
          </ErrorBoundary>
        </ApolloProvider>
      </React.Suspense>
    </ThemeProvider>
  ) : null
}

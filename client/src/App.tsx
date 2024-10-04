import '@assets/css/main.css'
import 'leaflet.locatecontrol/dist/L.Control.Locate.css'
import 'leaflet/dist/leaflet.css'

import * as React from 'react'
import { BrowserRouter } from 'react-router-dom'
import CssBaseline from '@mui/material/CssBaseline'
import ThemeProvider from '@mui/material/styles/ThemeProvider'
import { ApolloProvider } from '@apollo/client'
import { useCustomTheme } from '@assets/theme'
import { globalStyles } from '@components/Global'
import { apolloClient } from '@services/apollo'
import { isLocalStorageEnabled } from '@utils/isLocalStorageEnabled'
import { setLoadingText } from '@utils/setLoadingText'
import '@services/events'
import { ErrorBoundary } from '@components/ErrorBoundary'
import { HolidayEffects } from '@features/holiday'

import { Pages } from './pages'

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

export function App() {
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
            <BrowserRouter>
              <Pages />
            </BrowserRouter>
            <HolidayEffects />
          </ApolloProvider>
        </React.Suspense>
      </ErrorBoundary>
    </ThemeProvider>
  ) : null
}

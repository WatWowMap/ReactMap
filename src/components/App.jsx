import '@assets/css/main.css'
import 'leaflet.locatecontrol/dist/L.Control.Locate.css'
import 'leaflet/dist/leaflet.css'

import React, { Suspense } from 'react'
import { BrowserRouter } from 'react-router-dom'

import { ApolloProvider } from '@apollo/client'
import client from '@services/apollo'

import Config from './Config'
import ErrorBoundary from './ErrorBoundary'

const SetText = () => {
  const locales = {
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
  const locale = localStorage?.getItem('i18nextLng') || 'en'
  const loadingText = document.getElementById('loading-text')
  if (loadingText)
    loadingText.innerText = locales[locale.toLowerCase()] || locales.en
  return <div />
}

export default function App() {
  document.body.classList.add('dark')
  return (
    <Suspense fallback={<SetText />}>
      <ApolloProvider client={client}>
        <ErrorBoundary>
          <BrowserRouter>
            <Config />
          </BrowserRouter>
        </ErrorBoundary>
      </ApolloProvider>
    </Suspense>
  )
}

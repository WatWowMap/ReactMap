import '../assets/scss/main.scss'

import React, { Suspense } from 'react'
import { ApolloProvider } from '@apollo/client'
import client from '@services/apollo'

import ReactRouter from './ReactRouter'

const SetText = () => {
  const locale = {
    // de: '',
    en: 'Loading Translations',
    es: 'Cargando Traducciones',
    // fr: '',
    it: 'Caricamento Traduzioni',
    ja: '翻訳を読み込み中',
    ko: '번역 로드 중',
    // nl: '',
    // pl: '',
    'pt-br': 'Carregando Traduções',
    ru: 'Загрузка переводов',
    sv: 'Laddar Översättningar',
    th: 'กำลังโหลดการแปล',
    'zh-tw': '載入翻譯',
  }[localStorage?.getItem('i18nextLng')?.toLowerCase() || 'en']
  const loadingText = document.getElementById('loading-text')
  if (loadingText) loadingText.innerText = locale || 'Loading Translations'
  return <></>
}

export default function App() {
  document.body.classList.add('dark')

  return (
    <Suspense fallback={<SetText />}>
      <ApolloProvider client={client}>
        <ReactRouter />
      </ApolloProvider>
    </Suspense>
  )
}

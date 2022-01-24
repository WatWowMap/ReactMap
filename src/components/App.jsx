import '../assets/scss/main.scss'

import React, { Suspense } from 'react'
import { ApolloProvider } from '@apollo/client'
import client from '@services/apollo'

import ReactRouter from './ReactRouter'

const SetText = () => {
  const loadingText = document.getElementById('loading-text')
  if (loadingText) loadingText.innerHTML = 'Loading Translations'
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

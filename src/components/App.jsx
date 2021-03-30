import '../assets/scss/main.scss'

import React, { useState, useEffect } from 'react'
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client'

import ConfigSettings from './ConfigSettings'
import Fetch from '../services/Fetch'

const client = new ApolloClient({
  uri: '/graphql',
  cache: new InMemoryCache(),
})

export default function App() {
  const [serverSettings, setServerSettings] = useState(undefined)
  const getServerSettings = async () => {
    setServerSettings(await Fetch.fetchSettings())
  }

  useEffect(() => {
    getServerSettings()
  }, [])

  return (
    <ApolloProvider client={client}>
      {serverSettings
        && (
          <ConfigSettings
            serverSettings={serverSettings}
          />
        )}
    </ApolloProvider>
  )
}

import '../assets/scss/main.scss'

import React, { useState, useEffect } from 'react'
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client'

import ConfigSettings from './ConfigSettings'
import getSettings from '../services/getSettings'

const client = new ApolloClient({
  uri: '/graphql',
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          pokemon: {
            merge(existing, incoming) {
              return incoming
            },
          },
        },
      },
    },
  }),
})

export default function App() {
  const [serverSettings, setServerSettings] = useState(undefined)
  const getServerSettings = async () => {
    setServerSettings(await getSettings())
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

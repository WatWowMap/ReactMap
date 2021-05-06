import '../assets/scss/main.scss'

import React, { useEffect, useState } from 'react'
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client'
import { BrowserRouter as Router, Route } from 'react-router-dom'

import Fetch from '../services/Fetch'
import Auth from './Auth'

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
          gyms: {
            merge(existing, incoming) {
              return incoming
            },
          },
          pokestops: {
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
    setServerSettings(await Fetch.getSettings())
  }

  useEffect(() => {
    getServerSettings()
  }, [])

  return (
    <Router>
      <Route exact path="/">
        <ApolloProvider client={client}>
          {serverSettings && <Auth serverSettings={serverSettings} />}
        </ApolloProvider>
      </Route>
    </Router>
  )
}

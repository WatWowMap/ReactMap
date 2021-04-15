import '../assets/scss/main.scss'

import React, { useEffect, useState } from 'react'
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client'
import { BrowserRouter as Router, Route } from 'react-router-dom'

import ConfigSettings from './ConfigSettings'
import getSettings from '../services/getSettings'
import Login from './Login'

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
  const [user, setUser] = useState(undefined)
  const [serverSettings, setServerSettings] = useState(undefined)
  const getServerSettings = async () => {
    setServerSettings(await getSettings())
    const body = await getUser()
    setUser(body)
  }

  const getUser = async () => {
    try {
      const response = await fetch('/user')
      if (!response.ok) {
        throw new Error(`${response.status} (${response.statusText})`)
      }
      const body = await response.json()
      return body.user
    } catch (error) {
      console.error(error.message)
    }
  }

  useEffect(() => {
    getServerSettings()
  }, [])

  return (
    <Router>
      <Route exact path="/">
        <ApolloProvider client={client}>
          {user
            ? serverSettings && <ConfigSettings serverSettings={serverSettings} />
            : <Login />}
        </ApolloProvider>
      </Route>
    </Router>
  )
}

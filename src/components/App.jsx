import '../assets/scss/main.scss'

import React, { Suspense, useEffect, useState } from 'react'
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client'
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom'

import Fetch from '@services/Fetch'
import Auth from './Auth'
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
    <Suspense fallback="Loading translations...">
      <ApolloProvider client={client}>
        <Router>
          <Switch>
            <Route exact path="/">
              {serverSettings && <Auth serverSettings={serverSettings} />}
            </Route>
            <Route exact path="/@/:lat/:lon/:zoom">
              {serverSettings && <Auth serverSettings={serverSettings} />}
            </Route>
            <Route exact path="/id/:category/:id/:zoom">
              {serverSettings && <Auth serverSettings={serverSettings} />}
            </Route>
            <Route exact path="/login">
              <Login clickedTwice />
            </Route>
          </Switch>
        </Router>
      </ApolloProvider>
    </Suspense>
  )
}

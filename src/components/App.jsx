import '../assets/scss/main.scss'

import React, { Suspense, useEffect, useState } from 'react'
import {
  ApolloClient,
  ApolloProvider,
  InMemoryCache,
  createHttpLink,
} from '@apollo/client'
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom'
import ReactGA from 'react-ga'

import AbortableLink from '@classes/AbortableLink'
import UIcons from '@services/Icons'
import Fetch from '@services/Fetch'
import Auth from './Auth'
import Login from './Login'
import RouteChangeTracker from './RouteChangeTracker'

const client = new ApolloClient({
  uri: '/graphql',
  link: new AbortableLink().concat(createHttpLink()),
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
  const [serverSettings, setServerSettings] = useState(null)

  const getServerSettings = async () => {
    const data = await Fetch.getSettings()
    const Icons = data.config ? new UIcons(
      data.config.icons.customizable, data.config.icons.sizes, data.masterfile.questRewardTypes,
    ) : null
    if (Icons) {
      await Icons.fetchIcons(data.config.icons.styles)
      data.userSettings.icons = Icons.selected
    }
    setServerSettings({ ...data, Icons })
    if (data.config.googleAnalytics.enabled) {
      ReactGA.initialize(data.config.googleAnalytics)
    }
  }

  useEffect(() => {
    getServerSettings()
  }, [])

  return (
    <Suspense fallback="Loading translations...">
      <ApolloProvider client={client}>
        <Router>
          {(serverSettings && serverSettings.config.googleAnalytics.enabled) && <RouteChangeTracker />}
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

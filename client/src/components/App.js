import "../assets/scss/main.scss"

import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Switch, Route } from "react-router-dom"
import { hot } from "react-hot-loader/root.js"
import ConfigSettings from './ConfigSettings.jsx'
import Fetch from '../services/Fetch.js'
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client'

const client = new ApolloClient({
  uri: '/graphql',
  cache: new InMemoryCache()
})

const App = props => {
  const [serverSettings, setServerSettings] = useState(undefined)
  const getServerSettings = async () => {
    setServerSettings(await Fetch.fetchSettings())
  }

  useEffect(() => {
    getServerSettings()
  }, [])

  return (
    <Router>
      <Switch>
        <Route exact path="/">
          <ApolloProvider client={client}>
            {serverSettings && <ConfigSettings
              serverSettings={serverSettings}
            />}
          </ApolloProvider>
        </Route>
      </Switch>
    </Router>
  )
}

export default hot(App)
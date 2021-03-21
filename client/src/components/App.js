import "../assets/scss/main.scss"

import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Switch, Route } from "react-router-dom"
import { hot } from "react-hot-loader/root.js"
import ConfigSettings from './ConfigSettings.jsx'
import Fetch from '../services/Fetch.js'

const App = props => {
  const [config, setConfig] = useState(undefined)

  const getConfig = async () => {
    setConfig(await Fetch.fetchConfig())
  }

  useEffect(() => {
    getConfig()
  }, [])
  
  return (
    <Router>
      <Switch>
        <Route exact path="/">
          {config && <ConfigSettings 
            config={config}
          />}
        </Route>
      </Switch>
    </Router>
  )
}

export default hot(App)
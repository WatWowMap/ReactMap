import React from 'react'
import { Redirect, withRouter } from 'react-router-dom'

import ConfigSettings from './ConfigSettings'
import Login from './Login'
import WebhookQuery from './WebhookQuery'

const Auth = ({ serverSettings, match }) => {
  if (serverSettings.enabledAuthMethods.length > 0 && !serverSettings.user) {
    if (match.params.category || match.params.lat) {
      localStorage.setItem('params', JSON.stringify(match.params))
    }
    return <Login serverSettings={serverSettings} />
  }
  const cachedParams = JSON.parse(localStorage.getItem('params'))
  if (cachedParams) {
    localStorage.removeItem('params')
    const url = cachedParams.category
      ? `/id/${cachedParams.category}/${cachedParams.id}/${cachedParams.zoom}`
      : `/@/${cachedParams.lat}/${cachedParams.lon}/${cachedParams.zoom}`
    return <Redirect push to={url} />
  }
  if (match.params.category) {
    return (
      <WebhookQuery
        match={match}
        serverSettings={serverSettings}
      />
    )
  }
  if (serverSettings.enabledAuthMethods.length > 0 && serverSettings.user) {
    return <ConfigSettings serverSettings={serverSettings} match={match} />
  }
  if (serverSettings.enabledAuthMethods.length === 0) {
    return <ConfigSettings serverSettings={serverSettings} match={match} />
  }
}

export default withRouter(Auth)

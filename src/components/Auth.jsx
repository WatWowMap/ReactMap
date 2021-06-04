import React from 'react'
import { withRouter } from 'react-router-dom'

import ConfigSettings from './ConfigSettings'
import Login from './Login'
import WebhookQuery from './WebhookQuery'

const Auth = ({ serverSettings, match }) => {
  if (serverSettings.discord && !serverSettings.user) {
    if (match.params.category || match.params.lat) {
      localStorage.setItem('params', JSON.stringify(match.params))
    }
    return <Login />
  }
  const cachedParams = JSON.parse(localStorage.getItem('params'))
  if (match.params.category || (cachedParams && cachedParams.category)) {
    return (
      <WebhookQuery
        params={cachedParams || match.params}
        serverSettings={serverSettings}
      />
    )
  }
  if (serverSettings.discord && serverSettings.user) {
    return <ConfigSettings serverSettings={serverSettings} cachedParams={cachedParams} />
  }
  if (!serverSettings.discord) {
    return <ConfigSettings serverSettings={serverSettings} cachedParams={cachedParams} />
  }
}

export default withRouter(Auth)

import React from 'react'
import { withRouter } from 'react-router-dom'

import ConfigSettings from './ConfigSettings'
import Login from './Login'
import WebhookQuery from './WebhookQuery'

const Auth = ({ serverSettings, match }) => {
  if (serverSettings.discord && !serverSettings.user) {
    return <Login />
  }
  if (match.params.category) {
    return (
      <WebhookQuery
        params={match.params}
        serverSettings={serverSettings}
      />
    )
  }
  if (serverSettings.discord && serverSettings.user) {
    return <ConfigSettings serverSettings={serverSettings} />
  }
  if (!serverSettings.discord) {
    return <ConfigSettings serverSettings={serverSettings} />
  }
}

export default withRouter(Auth)

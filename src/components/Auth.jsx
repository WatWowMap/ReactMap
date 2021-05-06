import '../assets/scss/main.scss'

import React from 'react'
import ConfigSettings from './ConfigSettings'
import Login from './Login'

export default function Auth({ serverSettings }) {
  if (serverSettings.discord && !serverSettings.user) {
    return <Login />
  }
  if (serverSettings.discord && serverSettings.user) {
    return <ConfigSettings serverSettings={serverSettings} />
  }
  if (!serverSettings.discord) {
    return <ConfigSettings serverSettings={serverSettings} />
  }
}

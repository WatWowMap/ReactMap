import React from 'react'
import { render } from 'react-dom'
import ReactGA from 'react-ga'

import App from './components/App'
import './services/i18n'

if (process.env) {
  const { GOOGLE_ANALYTICS_ID, ANALYTICS_DEBUG_MODE, TITLE } = process.env
  if (process.env.GOOGLE_ANALYTICS_ID) {
    ReactGA.initialize(GOOGLE_ANALYTICS_ID, { debug: ANALYTICS_DEBUG_MODE })
  }
  if (TITLE) {
    document.title = TITLE
  }
}

document.addEventListener('DOMContentLoaded', () => {
  render(<App />, document.getElementById('root'))
})

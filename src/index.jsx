import React from 'react'
import { render } from 'react-dom'

import App from './components/App'
import './services/i18n'

document.addEventListener('DOMContentLoaded', () => {
  render(<App />, document.getElementById('root'))
})

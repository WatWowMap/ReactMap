// @ts-check
import { useEffect, useState } from 'react'
import { Config } from '@rm/types'

import { usePlayStore } from './store'

const DEFAULT = {
  settings: { parentStyle: {} },
  components: [],
  footerButtons: [],
  titles: [],
}

export function useSafeParse():
  | Partial<Config['map']['messageOfTheDay']>
  | Partial<Config['map']['loginPage']>
  | Partial<Config['map']['donationPage']> {
  const code = usePlayStore((s) => s.code)
  const component = usePlayStore((s) => s.component)

  const [cached, setCached] = useState(DEFAULT)

  useEffect(() => {
    try {
      const parsed = JSON.parse(code)

      if (!parsed.settings) {
        parsed.settings = {}
      }
      if (!parsed.settings.parentStyle) {
        parsed.settings.parentStyle = {}
      }
      if (!parsed.components) {
        parsed.components = []
      }
      if (!parsed.footerButtons && component !== 'loginPage') {
        parsed.footerButtons = []
      }
      if (!parsed.titles && component !== 'loginPage') {
        parsed.titles = []
      }
      setCached(parsed)
      usePlayStore.setState({ valid: true })
      localStorage.setItem('playground', code)
    } catch (e) {
      usePlayStore.setState({ valid: false, error: e })
      // eslint-disable-next-line no-console
      console.error(e)
    }
  }, [code, component])

  return cached
}

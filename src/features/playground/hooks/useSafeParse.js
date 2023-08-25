// @ts-check
import { useEffect, useState } from 'react'
import { usePlayStore } from './store'

const DEFAULT = {
  settings: { parentStyle: {} },
  components: [],
  footerButtons: [],
  titles: [],
}

export function useSafeParse() {
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
    } catch (e) {
      usePlayStore.setState({ valid: false, error: e })
      // eslint-disable-next-line no-console
      console.error(e)
    }
  }, [code, component])

  return cached
}

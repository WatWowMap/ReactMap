import { usePlayStore } from './store'

export function useSafeParse() {
  const component = usePlayStore((s) => s.component)
  const code = usePlayStore((s) => s.code)

  try {
    const parsed = JSON.parse(code)
    if (!parsed.settings) {
      parsed.settings = { parentStyle: {}, parentSx: {} }
    }
    if (!parsed.settings.parentStyle) {
      parsed.settings.parentStyle = {}
    }
    if (!parsed.settings.parentSx) {
      parsed.settings.parentSx = {}
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
    usePlayStore.setState({ valid: true })
    return parsed
  } catch (e) {
    usePlayStore.setState({ valid: false })
    return {
      components: [],
      footerButtons: [],
      titles: [],
      settings: { parentStyle: {}, parentSx: {} },
    }
  }
}

// @ts-check
import { usePlayStore } from './store'

export function useSafeParse() {
  const code = usePlayStore((s) => s.code)
  const component = usePlayStore((s) => s.component)

  try {
    const parsed = JSON.parse(code)
    if (!parsed.settings) {
      parsed.settings = { parentStyle: {} }
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
    return parsed
  } catch (e) {
    return null
  }
}

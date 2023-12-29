// @ts-check
import { useStatic, useStore } from '@hooks/useStore'

/** @param {KeyboardEvent} event */
function toggleDarkMode(event) {
  // This is mostly meant for development purposes
  if (event.ctrlKey && event.key === 'd') {
    useStore.setState((prev) => ({ darkMode: !prev.darkMode }))
  }
}
window.addEventListener('keydown', toggleDarkMode)

let timer

function onFocus() {
  if (timer) {
    clearTimeout(timer)
  }
  useStatic.setState({ active: true })
}
window.addEventListener('focus', onFocus)

function onBlur() {
  timer = setTimeout(() => {
    useStatic.setState({ active: false })
  }, 1000 * 60 * useStatic.getState().config.misc.clientTimeoutMinutes)
}
window.addEventListener('blur', onBlur)

function online() {
  useStatic.setState({ online: true })
}
window.addEventListener('online', online)

function offline() {
  useStatic.setState({ online: false })
}
window.addEventListener('offline', offline)

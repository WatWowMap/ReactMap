// @ts-check
import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'

/** @param {KeyboardEvent} event */
function toggleDarkMode(event) {
  // This is mostly meant for development purposes
  if (event.ctrlKey && event.key === 'd') {
    useStorage.setState((prev) => ({ darkMode: !prev.darkMode }))
  }
}
window.addEventListener('keydown', toggleDarkMode)

let timer

function onFocus() {
  if (timer) {
    clearTimeout(timer)
  }
  useMemory.setState({ active: true })
}
window.addEventListener('focus', onFocus)

function onBlur() {
  timer = setTimeout(() => {
    useMemory.setState({ active: false })
  }, 1000 * 60 * useMemory.getState().config.misc.clientTimeoutMinutes)
}
window.addEventListener('blur', onBlur)

function online() {
  useMemory.setState({ online: true })
}
window.addEventListener('online', online)

function offline() {
  useMemory.setState({ online: false })
}
window.addEventListener('offline', offline)

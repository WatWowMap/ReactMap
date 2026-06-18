// @ts-check
import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { setLongTimeout } from '@utils/setLongTimeout'

window.addEventListener('keydown', (event) => {
  // This is mostly meant for development purposes
  if (event.ctrlKey && event.key === 'd') {
    useStorage.setState((prev) => ({ darkMode: !prev.darkMode }))
  }
})

let timer

window.addEventListener('focus', () => {
  if (timer) {
    timer()
  }
  useMemory.setState({ active: true })
})

window.addEventListener('blur', () => {
  timer = setLongTimeout(
    () => {
      useMemory.setState({ active: false })
    },
    1000 * 60 * (useMemory.getState().config?.misc?.clientTimeoutMinutes || 5),
  )
})

window.addEventListener('online', () => useMemory.setState({ online: true }))

window.addEventListener('offline', () => useMemory.setState({ online: false }))

import { useState, useEffect } from 'react'

import { useStatic } from './useStore'

export function useWindowState() {
  const [windowState, setWindowState] = useState(true)

  useEffect(() => {
    const onFocus = () => setWindowState(true)
    const onBlur = () => setWindowState(false)

    window.addEventListener('focus', onFocus)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  useEffect(() => {
    if (windowState) {
      useStatic.setState({ active: windowState })
    } else {
      const timer = setTimeout(
        () => useStatic.setState({ active: windowState }),
        1000 * 60 * useStatic.getState().config.map.clientTimeoutMinutes,
      )
      return () => clearTimeout(timer)
    }
  }, [windowState])
}

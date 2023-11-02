import { useEffect } from 'react'

const rootLoading = document.getElementById('loader')

export function useHideElement(ready = true) {
  useEffect(() => {
    if (rootLoading && ready) {
      rootLoading.style.display = 'none'
    }
  }, [])
}

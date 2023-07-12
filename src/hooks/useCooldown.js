import { useEffect } from 'react'
import { useStore } from './useStore'

export default function useCooldown() {
  const scannerCooldown = useStore((s) => s.scannerCooldown)

  useEffect(() => {
    if (scannerCooldown > 0) {
      const timeout = setInterval(() => {
        const newTime = scannerCooldown - 1
        useStore.setState({ scannerCooldown: newTime })
      }, 1000)
      return () => clearInterval(timeout)
    }
  }, [scannerCooldown])
}

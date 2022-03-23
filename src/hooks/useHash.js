import { useEffect, useState } from 'react'

export default function useHash() {
  const [isOpen, setIsOpen] = useState(false)
  const [modalHash, setModalHash] = useState('')

  const toggleHash = (open, hash, child = false) => {
    if (open) {
      const merged = `#${hash.map(item => item || null).filter(Boolean).join('-')}`
      window.location.assign(child ? `${window.location.hash}${merged}` : merged)
      setModalHash(merged)
    } else {
      window.location.replace(child ? window.location.hash.replace(modalHash, '#') : '#')
      setModalHash('#')
    }
  }

  useEffect(() => {
    const handleOnHashChange = () => {
      setIsOpen(window.location.hash.includes(modalHash))
    }
    window.addEventListener('hashchange', handleOnHashChange)
    return () => window.removeEventListener('hashchange', handleOnHashChange)
  }, [modalHash])

  return [isOpen, toggleHash, modalHash]
}

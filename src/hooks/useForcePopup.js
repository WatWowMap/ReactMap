import { useEffect } from 'react'

export default function useForcePopup(itemId, ref, params, setParams, done) {
  useEffect(() => {
    const { id } = params
    if (id === itemId && ref?.current[itemId] && done) {
      ref.current[itemId].openPopup()
      setParams({})
    }
  }, [done])
}

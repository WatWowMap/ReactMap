import { useEffect } from 'react'

import { useMemory } from '@store/useMemory'

const cleanup = () =>
  useMemory.setState({ manualParams: { category: '', id: '' } })

export function useForcePopup(
  id: string | number,
  ref: import('leaflet').Marker<any>,
) {
  const manualParams = useMemory((s) => s.manualParams)

  useEffect(() => {
    if (id === manualParams.id && ref) {
      ref.openPopup()
      ref.on('popupclose', cleanup)
      return () => {
        ref.off('popupclose', cleanup)
        ref.closePopup()
      }
    }
  }, [manualParams, ref])
}

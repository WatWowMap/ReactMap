// @ts-check
import { useEffect } from 'react'

import { useMemory } from '@store/useMemory'

const cleanup = () =>
  useMemory.setState({ manualParams: { category: '', id: '' } })

/**
 *
 * @param {string | number} id
 * @param {import('leaflet').Marker<any>} ref
 */
export function useForcePopup(id, ref) {
  // a boolean, so every marker on the map doesn't re-render whenever any
  // popup opens or closes
  const isTarget = useMemory((s) => {
    const manualId = s.manualParams?.id
    return (
      manualId !== undefined &&
      manualId !== null &&
      manualId !== '' &&
      `${id}` === `${manualId}`
    )
  })

  useEffect(() => {
    if (isTarget && ref) {
      ref.openPopup()
      ref.on('popupclose', cleanup)
      return () => {
        ref.off('popupclose', cleanup)
        ref.closePopup()
      }
    }
  }, [isTarget, ref])
}

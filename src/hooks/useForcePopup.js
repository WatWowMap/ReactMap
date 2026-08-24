// @ts-check

import { useMemory } from '@store/useMemory'
import { useEffect } from 'react'

const cleanup = () =>
  useMemory.setState({ manualParams: { category: '', id: '' } })

/**
 *
 * @param {string | number} id
 * @param {import('leaflet').Marker<any>} ref
 */
export function useForcePopup(id, ref) {
  const manualParams = useMemory((s) => s.manualParams)

  useEffect(() => {
    const manualId = manualParams?.id
    if (
      manualId !== undefined &&
      manualId !== null &&
      manualId !== '' &&
      `${id}` === `${manualId}` &&
      ref
    ) {
      ref.openPopup()
      ref.on('popupclose', cleanup)
      return () => {
        ref.off('popupclose', cleanup)
        ref.closePopup()
      }
    }
  }, [manualParams, ref])
}

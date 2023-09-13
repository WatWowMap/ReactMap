// @ts-check
import { useEffect } from 'react'
import { useStatic } from './useStore'

const cleanup = () =>
  useStatic.setState({ manualParams: { category: '', id: '' } })

/**
 *
 * @param {string | number} id
 * @param {import('leaflet').Marker<any>} ref
 */
export default function useForcePopup(id, ref) {
  const manualParams = useStatic((s) => s.manualParams)

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

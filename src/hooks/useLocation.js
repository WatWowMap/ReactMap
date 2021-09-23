import { useState } from 'react'
import Locate from 'leaflet.locatecontrol'

export default function useLocation(map) {
  const [color, setColor] = useState('inherit')
  const [lc] = useState(() => {
    const LocateFab = Locate.extend({
      _setClasses(state) {
        if (state === 'requesting') setColor('action')
        else if (state === 'active') setColor('action')
        else if (state === 'following') setColor('primary')
      },
      _cleanClasses() {
        setColor('inherit')
      },
    })
    const result = new LocateFab({
      keepCurrentZoomLevel: true,
      setView: 'untilPan',
    })
    result.addTo(map)
    return result
  })
  return { lc, color }
}

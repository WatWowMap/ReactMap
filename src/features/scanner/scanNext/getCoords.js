// @ts-check
import { point } from '@turf/helpers'
import destination from '@turf/destination'

const OPTIONS = /** @type {const} */ ({ units: 'kilometers' })
const POKEMON_RADIUS = 70
const GYM_RADIUS = 750

const DISTANCE = {
  M: POKEMON_RADIUS * 1.732,
  XL: GYM_RADIUS * 1.732,
}

/**
 * Get scan next coords
 * @param {[number, number]} center
 * @param {import('../hooks/store').UseScanStore['scanNextSize']} size
 * @returns {import('../hooks/store').UseScanStore['scanCoords']}
 */
export const getScanNextCoords = (center, size) => {
  const coords = [center]
  if (size === 'S') return coords
  const start = point([center[1], center[0]])
  return coords.concat(
    [0, 60, 120, 180, 240, 300].map((bearing) => {
      const [lon, lat] = destination(
        start,
        DISTANCE[size] / 1000,
        bearing,
        OPTIONS,
      ).geometry.coordinates
      return [lat, lon]
    }),
  )
}

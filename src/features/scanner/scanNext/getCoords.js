// @ts-check
import { point } from '@turf/helpers'
import destination from '@turf/destination'
import { S2CellId, S2LatLng } from 'nodes2ts'

const OPTIONS = /** @type {const} */ ({ units: 'kilometers' })
const POKEMON_RADIUS = 70
const GYM_RADIUS = 750

const HEX_DISTANCE = {
  M: POKEMON_RADIUS * 1.732,
  XL: GYM_RADIUS * 1.732,
}

const NINE_CELL_LEVEL = 15
const NINE_CELL_SIZE = 9
const NINE_CELL_RADIUS = (NINE_CELL_SIZE - 1) / 2

/**
 * Build a 9x9 grid of S2 level-15 cell centers around the selected point.
 * @param {[number, number]} center
 * @returns {import('../hooks/store').UseScanStore['scanCoords']}
 */
const getNineCellCoords = (center) => {
  const latLng = S2LatLng.fromDegrees(center[0], center[1])
  const baseCell = S2CellId.fromPoint(latLng.toPoint()).parentL(NINE_CELL_LEVEL)
  const size = baseCell.getSizeIJ()
  const baseIJO = baseCell.toIJOrientation()
  const baseI = S2CellId.getI(baseIJO)
  const baseJ = S2CellId.getJ(baseIJO)
  const { face } = baseCell

  const offsets = []
  for (let di = -NINE_CELL_RADIUS; di <= NINE_CELL_RADIUS; di += 1) {
    for (let dj = -NINE_CELL_RADIUS; dj <= NINE_CELL_RADIUS; dj += 1) {
      offsets.push({
        di,
        dj,
        manhattan: Math.abs(di) + Math.abs(dj),
        chebyshev: Math.max(Math.abs(di), Math.abs(dj)),
      })
    }
  }

  offsets.sort((a, b) => {
    if (a.manhattan !== b.manhattan) return a.manhattan - b.manhattan
    if (a.chebyshev !== b.chebyshev) return a.chebyshev - b.chebyshev
    if (a.di !== b.di) return a.di - b.di
    return a.dj - b.dj
  })

  return offsets.map(({ di, dj }) => {
    const targetI = baseI + di * size
    const targetJ = baseJ + dj * size
    const sameFace =
      targetI >= 0 &&
      targetI < S2CellId.MAX_SIZE &&
      targetJ >= 0 &&
      targetJ < S2CellId.MAX_SIZE
    const cell = (
      sameFace
        ? S2CellId.fromFaceIJ(face, targetI, targetJ)
        : S2CellId.fromFaceIJWrap(face, targetI, targetJ)
    ).parentL(NINE_CELL_LEVEL)
    const pointLatLng = cell.toLatLng()
    return [pointLatLng.latDegrees, pointLatLng.lngDegrees]
  })
}

/**
 * Get scan next coords
 * @param {[number, number]} center
 * @param {import('../hooks/store').UseScanStore['scanNextSize']} size
 * @param {{ nineCellScan?: boolean }} [options]
 * @returns {import('../hooks/store').UseScanStore['scanCoords']}
 */
export const getScanNextCoords = (center, size, options = {}) => {
  if (size === 'XL' && options.nineCellScan) {
    return getNineCellCoords(center)
  }

  const coords = [center]
  if (size === 'S') return coords

  const distance = HEX_DISTANCE[size]
  if (!distance) return coords

  const start = point([center[1], center[0]])
  return coords.concat(
    [0, 60, 120, 180, 240, 300].map((bearing) => {
      const [lon, lat] = destination(start, distance / 1000, bearing, OPTIONS)
        .geometry.coordinates
      return [lat, lon]
    }),
  )
}

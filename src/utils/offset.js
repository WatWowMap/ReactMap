// @ts-check
/* eslint-disable no-bitwise */
import Long from 'long'
import { S2CellId, S2LatLng, S2LatLngRect, S2RegionCoverer } from 'nodes2ts'

const NEARBY_STOP_RADIUS_M = 40
export const NEARBY_CELL_LEVEL = 15
const TARGET_LEVEL = 20
const MAX_NEARBY_STOP_CELLS = 64
const MIN_COS_LAT = 1e-6
const NEARBY_CELL_CHILD_COUNT = 1 << (2 * (TARGET_LEVEL - NEARBY_CELL_LEVEL))
const NEARBY_CELL_CHILD_STRIDE =
  S2CellId.lowestOnBitForLevel(TARGET_LEVEL).shiftLeft(1)

/**
 * cyrb53 hash function
 * @param {string} str
 * @param {number} [seed]
 * @returns {[number, number]}
 */
export const cyrb53 = (str, seed = 0) => {
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c6ce57 ^ seed
  for (let i = 0, ch; i < str.length; i += 1) {
    ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return [h1, h2]
}

/**
 * Calculate a deterministic index for choices of the given length.
 * @param {number} length
 * @param {string} hashKey
 * @returns {number | null}
 */
const getDeterministicIndex = (length, hashKey) => {
  if (!length) return null
  const [low, high] = cyrb53(hashKey)
  return ((low >>> 0) + (high >>> 0)) % length
}

/**
 * Build a list of level 20 cell centers within 40 m of the provided location.
 * @param {S2LatLng} origin
 * @returns {S2LatLng[]}
 */
const getNearbyStopCenters = (origin) => {
  const latDelta =
    (NEARBY_STOP_RADIUS_M / S2LatLng.EARTH_RADIUS_METERS) * (180 / Math.PI)
  const cosLat = Math.max(Math.cos(origin.latRadians), MIN_COS_LAT)
  const lngDelta =
    (NEARBY_STOP_RADIUS_M / (S2LatLng.EARTH_RADIUS_METERS * cosLat)) *
    (180 / Math.PI)

  const coverer = new S2RegionCoverer()
  coverer.setMinLevel(TARGET_LEVEL)
  coverer.setMaxLevel(TARGET_LEVEL)
  coverer.setMaxCells(MAX_NEARBY_STOP_CELLS)

  const bounds = S2LatLngRect.fromCenterSize(
    origin,
    S2LatLng.fromDegrees(latDelta * 2, lngDelta * 2),
  )
  const covering = coverer.getCoveringCells(bounds)

  return covering
    .map((cellId) => cellId.toLatLng())
    .filter((latLng) => origin.getEarthDistance(latLng) <= NEARBY_STOP_RADIUS_M)
}

/**
 * Build a deterministic level 20 cell center within the level 15 cell enclosing the origin.
 * @param {S2LatLng} origin
 * @param {string} hashKey
 * @returns {[number, number] | null}
 */
const getNearbyCellCenter = (origin, hashKey) => {
  const index = getDeterministicIndex(NEARBY_CELL_CHILD_COUNT, hashKey)
  if (index === null) return null

  const parent = S2CellId.fromPoint(origin.toPoint()).parentL(NEARBY_CELL_LEVEL)
  const start = parent.childBeginL(TARGET_LEVEL)
  const offset = NEARBY_CELL_CHILD_STRIDE.multiply(Long.fromNumber(index))
  const cellId = new S2CellId(start.id.add(offset))
  const latLng = cellId.toLatLng()

  return /** @type {[number, number]} */ [latLng.latDegrees, latLng.lngDegrees]
}

/**
 * Return the center point of a level 20 S2 cell selected to mimic in-game nearby placement.
 * @param {{ coords: [number, number], id: string | number, seenType?: string, seed?: number }} params
 * @returns {[number, number]}
 */
export const getOffset = ({ coords, id, seenType, seed = 0 }) => {
  if (!seenType) return coords

  const origin = S2LatLng.fromDegrees(coords[0], coords[1])
  const hashKey = `${id}-${seenType}-${seed}`

  if (seenType === 'nearby_cell') {
    return getNearbyCellCenter(origin, hashKey) ?? coords
  }

  if (seenType === 'nearby_stop' || seenType.includes('lure')) {
    const centers = getNearbyStopCenters(origin)
    const index = getDeterministicIndex(centers.length, hashKey)
    if (index === null) return coords
    const latLng = centers[index]
    return /** @type {[number, number]} */ [
      latLng.latDegrees,
      latLng.lngDegrees,
    ]
  }

  return coords
}

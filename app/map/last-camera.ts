import type { Camera } from './use-map-libre'

/**
 * Where the 1.0 map opened by default: roughly the middle of the North
 * Atlantic, a deliberately uninteresting fallback used only when neither
 * the URL nor this device has a camera to offer.
 */
export const DEFAULT_CAMERA: Camera = { lat: 0, lon: 0, zoom: 2 }

/** `localStorage` key holding the last camera this device looked at. */
export const LAST_CAMERA_KEY = 'lastCamera'

/**
 * The camera lives in `localStorage` rather than in the profile's
 * `preferences` blob on purpose: it survives a real reload, costs no
 * server round trip on a `moveend` that fires once per gesture, and is
 * genuinely device-local -- a phone should not jump to wherever a desktop
 * was parked.
 */

function isCamera(value: unknown): value is Camera {
  if (typeof value !== 'object' || value === null) return false
  const { lat, lon, zoom } = value as Record<string, unknown>
  return (
    inRange(lat, -90, 90) && inRange(lon, -180, 180) && inRange(zoom, 0, 24)
  )
}

/** Finite, a number, and inside the range the map can actually show. */
function inRange(value: unknown, min: number, max: number): boolean {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  )
}

/**
 * The stored camera, or null when there is none, when it cannot be read,
 * or when what is there is not a camera. Anything short of three finite,
 * in-range numbers falls through: a partial or hand-edited value must land
 * on the default rather than putting the map at `NaN`, where MapLibre
 * renders nothing and says nothing about why.
 */
export function readLastCamera(): Camera | null {
  try {
    const raw = window.localStorage.getItem(LAST_CAMERA_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isCamera(parsed)) return null
    return { lat: parsed.lat, lon: parsed.lon, zoom: parsed.zoom }
  } catch {
    return null
  }
}

/**
 * Records the camera for the next visit. Storage can throw - private
 * browsing, a full quota - and a failure to remember where the map was is
 * never worth breaking a pan over, so it is swallowed.
 */
export function writeLastCamera(camera: Camera): void {
  try {
    window.localStorage.setItem(LAST_CAMERA_KEY, JSON.stringify(camera))
  } catch {
    // Ignored: see above.
  }
}

/** A URL param, when it is present and reads as a finite number. */
function numberParam(params: URLSearchParams, key: string): number | undefined {
  if (!params.has(key)) return undefined
  const value = Number(params.get(key))
  return Number.isFinite(value) ? value : undefined
}

/**
 * The camera the map should open at, in precedence order:
 *
 * 1. URL params, which are explicit, shareable, and what a deep link
 *    (`/@/:lat/:lon/:zoom`) produces, so they must win over anything
 *    remembered.
 * 2. The last camera this device looked at, which is what makes leaving
 *    `/map` for Filters and coming back through the bottom nav - a bare
 *    `<NavLink to="/map">` with no query string - land where it left
 *    rather than in the Atlantic.
 * 3. `DEFAULT_CAMERA`.
 *
 * Precedence is per field, so a 1.0 deep link carrying `lat` and `lon` but
 * no `zoom` keeps the zoom the visitor was last at instead of snapping out
 * to world view.
 */
export function resolveInitialCamera(params: URLSearchParams): Camera {
  const base = readLastCamera() ?? DEFAULT_CAMERA
  return {
    lat: numberParam(params, 'lat') ?? base.lat,
    lon: numberParam(params, 'lon') ?? base.lon,
    zoom: numberParam(params, 'zoom') ?? base.zoom,
  }
}

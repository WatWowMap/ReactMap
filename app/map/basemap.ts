import type { StyleSpecification } from 'maplibre-gl'

/**
 * Keyless vector style, no signup and no rate-limited key required. This is
 * the default every self-hoster gets with zero configuration: OpenFreeMap
 * serves the full planet's OSM data as vector tiles under ODbL, funded
 * separately from any single provider's key quota.
 *
 * https://openfreemap.org
 */
const KEYLESS_VECTOR_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

/**
 * `VITE_BASEMAP_URL` is the one config field a self-hoster touches to
 * change the basemap, mirroring 1.0's `tileServers[].url` field in shape: a
 * `{z}/{x}/{y}` template means raster tiles, anything else is treated as a
 * vector style document to load directly. Unset keeps the keyless vector
 * default above, so requiring an API key is never the out-of-the-box
 * experience.
 */
function readConfiguredBasemapUrl(): string | undefined {
  const value = import.meta.env.VITE_BASEMAP_URL
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function isRasterTemplate(url: string): boolean {
  return url.includes('{z}') && url.includes('{x}') && url.includes('{y}')
}

/**
 * Builds a minimal raster-only style around one tile URL template, the same
 * shape 1.0's `tileServers` entries already carry. `tileSize` is 256 because
 * every server in 1.0's default `tileServers` list serves 256px tiles.
 */
function buildRasterStyle(tileUrlTemplate: string): StyleSpecification {
  return {
    version: 8,
    sources: {
      basemap: {
        type: 'raster',
        tiles: [tileUrlTemplate],
        tileSize: 256,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
    },
    layers: [
      {
        id: 'basemap',
        type: 'raster',
        source: 'basemap',
      },
    ],
  }
}

/**
 * Resolves what `MapCanvas` should hand MapLibre as `style`: either a style
 * document (raster, built locally) or a URL MapLibre fetches itself (the
 * keyless vector default, or a self-hoster's own vector style document).
 */
export function resolveBasemapStyle(): StyleSpecification | string {
  const configured = readConfiguredBasemapUrl()
  if (!configured) return KEYLESS_VECTOR_STYLE_URL
  return isRasterTemplate(configured)
    ? buildRasterStyle(configured)
    : configured
}

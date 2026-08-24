import { Navigate, useParams } from 'react-router'

/**
 * 1.0 deep links are `/@/:lat/:lon` or `/@/:lat/:lon/:zoom`, and are in the
 * wild (bookmarks, shared links). The 2.0 route table owns `/map`, so this
 * component's only job is translating those params into `/map`'s own
 * camera query params and handing off with a redirect. It never mounts
 * MapLibre itself, and is registered directly rather than through
 * `lazy()`: it has no heavy dependency to defer, and going through `/map`
 * is what actually loads the map lazily, on the same terms as a visitor
 * who typed `/map` directly.
 *
 * Missing or non-numeric params still redirect, just without a camera, so
 * `/map` falls back to `MapPage`'s own default rather than this route
 * needing to duplicate that fallback.
 */
export function DeepLink() {
  const { lat, lon, zoom } = useParams()
  const params = new URLSearchParams()
  if (lat) params.set('lat', lat)
  if (lon) params.set('lon', lon)
  if (zoom) params.set('zoom', zoom)
  const search = params.toString()
  return <Navigate to={search ? `/map?${search}` : '/map'} replace />
}

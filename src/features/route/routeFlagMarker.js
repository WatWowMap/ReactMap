// @ts-check
import { divIcon } from 'leaflet'

/**
 * @param {number} count
 * @param {boolean} active
 */
export function routeFlagMarker(count, active) {
  const badge =
    count > 1 ? `<span class="route-flag__badge">${count}</span>` : ''
  const html = `
    <div class="route-flag__wrapper" aria-hidden="true">
      <span class="route-flag__emoji">🚩</span>
      ${badge}
    </div>
  `
    .replace(/\s+</g, '<')
    .trim()
  return divIcon({
    className: `route-flag ${active ? 'route-flag--active' : ''}`,
    html,
    iconSize: [32, 32],
    iconAnchor: [16, 28],
    popupAnchor: [0, -24],
  })
}

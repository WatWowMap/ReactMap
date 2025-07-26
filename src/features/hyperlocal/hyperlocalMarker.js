// @ts-check

/**
 * Creates a circle marker for hyperlocal bonus regions
 * @param {object} hyperlocal - The hyperlocal data object
 * @returns {object} Circle marker configuration
 */
export function hyperlocalMarker(hyperlocal) {
  const { lat, lon, radius_m } = hyperlocal

  return {
    center: [lat, lon],
    radius: radius_m,
    pathOptions: {
      color: '#FFD700', // Gold color for bonus regions
      fillColor: '#FFD700',
      fillOpacity: 0.3,
      weight: 2,
      opacity: 0.7,
    },
    className: 'hyperlocal-circle',
  }
}

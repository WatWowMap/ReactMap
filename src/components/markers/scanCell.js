export default function scanCellMarker(updated) {
  const ago = Date.now() / 1000 - updated
  const value = ago <= 1050 ? 0 : Math.min((ago - 1050) / 750, 1)
  const hue = ((1 - value) * 120).toString(10)

  return {
    fillColor: ['hsl(', hue, ',100%, 50%)'].join(''),
    color: 'black',
    opacity: 0.75,
    fillOpacity: 0.5,
    weight: 0.5,
  }
}

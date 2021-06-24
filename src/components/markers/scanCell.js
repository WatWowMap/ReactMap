export default function scanCellMarker(cellUpdated) {
  const ago = (new Date()).getTime() - (cellUpdated * 1000)
  const value = ago <= 150000 ? 0 : Math.min((ago - 150000) / 750000, 1)
  const hue = ((1 - value) * 120).toString(10)

  return {
    fillColor: ['hsl(', hue, ',100%,50%)'].join(''),
    color: 'black',
    opacity: 0.75,
    fillOpacity: 0.5,
    weight: 0.5,
  }
}

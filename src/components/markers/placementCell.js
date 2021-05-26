export default function placementStyle(cellBlocked, tileStyle) {
  return {
    fillColor: cellBlocked ? 'black' : 'green',
    color: tileStyle === 'dark' ? 'red' : 'black',
    opacity: 0.75,
    fillOpacity: cellBlocked ? 0.25 : 0,
    weight: 0.35,
  }
}

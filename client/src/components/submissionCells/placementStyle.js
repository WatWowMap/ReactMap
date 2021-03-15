export default function (cellBlocked) {
  return {
    fillColor: cellBlocked ? 'black' : 'green',
    color: 'black',
    opacity: 0.75,
    fillOpacity: cellBlocked ? 0.25 : 0,
    weight: 0.35
  }
}
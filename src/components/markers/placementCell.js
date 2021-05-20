import { useStore } from '../../hooks/useStore'

export default function placementStyle(cellBlocked) {
  const { tileServers: { style } } = useStore(state => state.settings)
  return {
    fillColor: cellBlocked ? 'black' : 'green',
    color: style === 'dark' ? 'red' : 'black',
    opacity: 0.75,
    fillOpacity: cellBlocked ? 0.25 : 0,
    weight: 0.35,
  }
}

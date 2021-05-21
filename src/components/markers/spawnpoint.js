export default function spawnpointMarker(spawnpoint) {
  return {
    color: spawnpoint.despawn_sec ? 'green' : 'red',
  }
}

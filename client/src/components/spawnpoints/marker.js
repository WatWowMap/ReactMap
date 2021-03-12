export default function (spawnpoint) {
  return {
    color: spawnpoint.despawn_sec ? 'green' : 'red',
    fillColor: spawnpoint.despawn_sec ? 'green' : 'red',
    fillOpacity: 0.5,  
  }
}
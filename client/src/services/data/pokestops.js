export default async function (bounds) {
  const maxLat = bounds._northEast.lat
  const maxLon = bounds._northEast.lng
  const minLat = bounds._southWest.lat
  const minLon = bounds._southWest.lng
  try {
    const response = await fetch(`/api/v1/data/pokestops?maxLat=${maxLat}&maxLon=${maxLon}&minLat=${minLat}&minLon=${minLon}`)
    if (!response.ok) {
      throw new Error(`${response.status} (${response.statusText})`)
    }
    const body = await response.json()
    return body.pokestops
  } catch (error) {
    console.error(error.message)
  }
}
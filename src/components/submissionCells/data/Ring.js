class Ring {
  constructor(lat, lon, radius) {
    this.id = `${lat}-${lon}-${radius}`
    this.lat = lat
    this.lon = lon
    this.radius = radius
  }
}

export default Ring

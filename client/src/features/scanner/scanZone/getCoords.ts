import { point } from '@turf/helpers'
import destination from '@turf/destination'

const OPTIONS = { units: 'kilometers' } as const

const BEARINGS = {
  1: 30,
  2: 90,
  3: 150,
  4: 210,
  5: 270,
  6: 330,
}

export const getScanZoneCoords = (
  center: [number, number],
  radius: number,
  spacing: number,
  scanZoneSize: import('../hooks/store').UseScanStore['scanZoneSize'],
) => {
  const coords = [center]
  let currentPoint = point([center[1], center[0]])
  const distance = radius * 2 * Math.cos(30 * (Math.PI / 180))

  for (let i = 1; i < scanZoneSize + 1; i += 1) {
    let quadrant = 1
    let step = 1

    while (step < 6 * i + 1) {
      currentPoint = destination(
        currentPoint,
        (distance * spacing) / 1000,
        step === 1 ? 330 : BEARINGS[quadrant],
        OPTIONS,
      )
      coords.push([
        currentPoint.geometry.coordinates[1],
        currentPoint.geometry.coordinates[0],
      ])
      quadrant = Math.floor(step / i) + 1
      step += 1
    }
  }

  return coords
}

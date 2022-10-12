import { point, polygon } from '@turf/helpers'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'

export default function checkAreaValidity(center, areaRestrictions, scanAreas) {
  if (!areaRestrictions?.length || !scanAreas?.length) return true
  let isValid = false
  if (areaRestrictions?.length && scanAreas?.length) {
    const testPoint = point([center[1], center[0]])
    areaRestrictions.map((area) => {
      if (
        scanAreas.some(
          (scanArea) =>
            scanArea.properties.name === area &&
            booleanPointInPolygon(
              testPoint,
              polygon(scanArea.geometry.coordinates),
            ),
        )
      ) {
        isValid = true
      }
      return true
    })
  }
  return isValid
}

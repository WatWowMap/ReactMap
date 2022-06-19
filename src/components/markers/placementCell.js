export default function placementStyle(cellBlocked, tileStyle, userSettings) {
  return {
    fillColor: userSettings.cellBlocked,
    color:
      tileStyle === 'dark'
        ? userSettings.darkMapBorder
        : userSettings.lightMapBorder,
    opacity: 0.75,
    fillOpacity: cellBlocked ? 0.25 : 0,
    weight: 0.35,
  }
}

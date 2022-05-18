export default function typeStyle(cell, tileStyle, userSettings) {
  const color = tileStyle === 'dark' ? userSettings.darkMapBorder : userSettings.lightMapBorder
  if ((cell.count === 1 && cell.count_gyms < 1)
    || (cell.count === 5 && cell.count_gyms < 2)
    || (cell.count === 19 && cell.count_gyms < 3)) {
    return {
      fillColor: userSettings.oneStopTillNext, color, opacity: 0.75, fillOpacity: 0.5, weight: 0.75,
    }
  }
  if ((cell.count === 4 && cell.count_gyms < 2) || (cell.count === 18 && cell.count_gyms < 3)) {
    return {
      fillColor: userSettings.twoStopsTillNext, color, opacity: 0.75, fillOpacity: 0.5, weight: 0.75,
    }
  }
  if (cell.count >= 20) {
    return {
      fillColor: userSettings.noMoreGyms, color, opacity: 0.75, fillOpacity: 0.25, weight: 0.8,
    }
  }
  return { color, opacity: 0.75, fillOpacity: 0.0, weight: 0.8 }
}

// @ts-check

/**
 *
 * @param {import("@rm/types/lib").Level14Cell} cell
 * @param {number} total
 * @param {string} oneStopTillNext
 * @param {string} twoStopsTillNext
 * @param {string} noMoreGyms
 * @returns {L.PathOptions}
 */
export default function typeStyle(
  cell,
  total,
  oneStopTillNext,
  twoStopsTillNext,
  noMoreGyms,
) {
  if (
    (total === 1 && cell.count_gyms < 1) ||
    (total === 5 && cell.count_gyms < 2) ||
    (total === 19 && cell.count_gyms < 3)
  ) {
    return {
      fillColor: oneStopTillNext,
      fillOpacity: 0.5,
    }
  }
  if (
    (total === 4 && cell.count_gyms < 2) ||
    (total === 18 && cell.count_gyms < 3)
  ) {
    return {
      fillColor: twoStopsTillNext,
      fillOpacity: 0.5,
    }
  }
  if (total >= 20) {
    return {
      fillColor: noMoreGyms,
      fillOpacity: 0.25,
    }
  }
  return { fillOpacity: 0.0 }
}

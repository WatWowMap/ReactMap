/**
 * Returns dynamic opacity based on timestamp
 * @param {number} timestamp
 * @param {Record<string, any>} userSettings
 * @returns
 */
export default function getOpacity(timestamp, userSettings) {
  const now = Math.floor(Date.now() / 1000)
  const diff = timestamp - now
  if (!diff || diff > 600) return 1
  if (diff > 300) return userSettings.opacityTenMinutes
  if (diff > 60) return userSettings.opacityFiveMinutes
  return userSettings.opacityOneMinute
}

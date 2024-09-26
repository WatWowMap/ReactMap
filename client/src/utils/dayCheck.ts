export function dayCheck(currentStamp: number, desiredStamp: number) {
  const locale = localStorage.getItem('i18nextLng') || 'en'
  if (currentStamp - desiredStamp < 86400) {
    return new Date(desiredStamp * 1000).toLocaleTimeString(locale)
  }
  return new Date(desiredStamp * 1000).toLocaleString(locale)
}

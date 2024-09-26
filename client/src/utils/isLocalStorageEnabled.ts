// @ts-check

export function isLocalStorageEnabled() {
  const test = 'test'

  try {
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch (e) {
    return false
  }
}

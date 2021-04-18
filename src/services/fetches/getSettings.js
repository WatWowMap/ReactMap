export default async function getSettings() {
  try {
    const response = await fetch('/settings')
    if (!response.ok) {
      throw new Error(`${response.status} (${response.statusText})`)
    }
    const body = await response.json()
    return body.serverSettings
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error.message)
  }
}

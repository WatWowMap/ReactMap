export default async function getUser() {
  try {
    const response = await fetch('/user')
    if (!response.ok) {
      throw new Error(`${response.status} (${response.statusText})`)
    }
    const body = await response.json()
    return body.user
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error.message)
  }
}

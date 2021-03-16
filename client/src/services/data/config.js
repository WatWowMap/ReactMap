export default async function () {
  try {
    const response = await fetch(`/config`)
    if (!response.ok) {
      throw new Error(`${response.status} (${response.statusText})`)
    }
    const body = await response.json()
    return body.config
  } catch (error) {
    console.error(error.message)
  }
}
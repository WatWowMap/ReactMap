export default async function () {
  try {
    const response = await fetch(`/quests`)
    if (!response.ok) {
      throw new Error(`${response.status} (${response.statusText})`)
    }
    const body = await response.json()
    return body.quests
  } catch (error) {
    console.error(error.message)
  }
}
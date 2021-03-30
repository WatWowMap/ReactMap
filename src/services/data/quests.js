/* eslint-disable consistent-return */
/* eslint-disable no-console */
export default async function getQuests() {
  try {
    const response = await fetch('/quests')
    if (!response.ok) {
      throw new Error(`${response.status} (${response.statusText})`)
    }
    const body = await response.json()
    return body.quests
  } catch (error) {
    console.error(error.message)
  }
}

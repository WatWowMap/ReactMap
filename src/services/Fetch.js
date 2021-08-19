/* eslint-disable no-console */

export default class Fetch {
  static async getSettings() {
    try {
      const response = await fetch('/settings')
      if (!response.ok) {
        throw new Error(`${response.status} (${response.statusText})`)
      }
      const body = await response.json()
      return body.serverSettings
    } catch (error) {
      console.error(error.message, '\nUnable to fetch settings at this time, please try again later.')
      return { error: true }
    }
  }

  static async getIcons(iconPath) {
    try {
      const response = await fetch(`${iconPath}/index.json`)
      if (!response.ok) {
        throw new Error(`${response.status} (${response.statusText})`)
      }
      return response.json()
    } catch (error) {
      console.error(error.message, `Unable to fetch ${iconPath} at this time, please try again later.`)
    }
  }

  static async getInvasions(invasions) {
    try {
      const newInvasions = {}
      const response = await fetch('https://raw.githubusercontent.com/ccev/pogoinfo/v2/active/grunts.json')
      const pogoInfo = await response.json()

      Object.entries(invasions).forEach(gruntType => {
        const [type, info] = gruntType
        const latest = pogoInfo ? pogoInfo[type] : {}

        newInvasions[type] = invasions[type]
        if (info.encounters) {
          Object.keys(info.encounters).forEach((position, i) => {
            if (latest && latest.active) {
              newInvasions[type].encounters[position] = latest.lineup.team[i].map(pkmn => pkmn.id)
              newInvasions[type].second_reward = latest.lineup.rewards.length > 1
            }
          })
        }
      })
      return newInvasions
    } catch (e) {
      console.log('Unable to fetch most recent Invasions')
      return invasions
    }
  }
}

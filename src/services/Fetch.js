/* eslint-disable no-return-await */
import fetchSettings from './data/settings'
import fetchAvailableQuests from './data/quests'

class Fetch {
  static async fetchSettings() {
    return await fetchSettings()
  }

  static async fetchAvailableQuests() {
    return await fetchAvailableQuests()
  }
}

export default Fetch

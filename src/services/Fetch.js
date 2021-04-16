import getUser from './fetches/getUser'
import getSettings from './fetches/getSettings'

class Fetch {
  static getUser() {
    return getUser()
  }

  static getSettings() {
    return getSettings()
  }
}

export default Fetch

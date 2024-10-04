const path = require('path')
const fs = require('fs')

const configDir = path.join(__dirname, '../../../config/user')

/**
 *
 * @param {string} fileName
 * @param {string} data
 */
async function writeConfigFile(fileName, data) {
  const ts = Math.floor(Date.now() / 1000)

  if (fs.existsSync(`${configDir}/${fileName}.json`)) {
    await fs.promises.copyFile(
      `${configDir}/${fileName}.json`,
      `${configDir}/${fileName}_${ts}.json`,
    )
  }
  await fs.promises.writeFile(`${configDir}/${fileName}.json`, data, 'utf8')

  return `Saved to ${configDir}/${fileName}.json`
}

module.exports = { writeConfigFile }

// @ts-check
const { resolve } = require('path')
const fs = require('fs')

/**
 * @returns {import('vite').Plugin}
 */
const faviconPlugin = () => ({
  name: 'vite-plugin-locales',
  generateBundle() {
    const favicon = fs.existsSync(
      resolve(__dirname, '../../../public/favicon/favicon.ico'),
    )
      ? resolve(__dirname, '../../../public/favicon/favicon.ico')
      : resolve(__dirname, '../../../public/favicon/fallback.ico')
    this.emitFile({
      type: 'asset',
      fileName: 'favicon.ico',
      source: fs.readFileSync(favicon),
    })
  },
})

module.exports = {
  faviconPlugin,
}

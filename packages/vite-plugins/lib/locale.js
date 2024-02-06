// @ts-check
const { join } = require('path')

const { create, writeAll } = require('@rm/locales')

/**
 * @param {boolean} isDevelopment
 * @returns {import('vite').Plugin}
 */
const localePlugin = (isDevelopment) => ({
  name: 'vite-plugin-locales',
  async buildStart() {
    if (!isDevelopment) return
    const localeObj = await create()
    await writeAll(localeObj, true, __dirname, '../../../public/locales')
  },
  async generateBundle() {
    if (isDevelopment) return
    const localeObj = await create()

    Object.entries(localeObj).forEach(([locale, translations]) => {
      const fileName = join('locales', locale, 'translation.json')
      this.emitFile({
        type: 'asset',
        fileName,
        source: JSON.stringify(translations),
      })
    })
  },
})

module.exports = {
  localePlugin,
}

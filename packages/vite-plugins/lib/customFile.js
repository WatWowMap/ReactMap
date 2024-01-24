// @ts-check
const { extname } = require('path')
const fs = require('fs')

/**
 * @param {boolean} isDevelopment
 * @returns {import('vite').Plugin}
 */
const customFilePlugin = (isDevelopment) => {
  const fileRegex = /\.(jsx?|css)$/
  const customPaths = []
  return {
    name: 'vite-plugin-custom-file-checker',
    load(id) {
      if (fileRegex.test(id) && !/node_modules/.test(id)) {
        const ext = extname(id)
        const newPath = id.replace(ext, `.custom${ext}`)
        if (fs.existsSync(newPath)) {
          customPaths.push(newPath)
          return {
            code: fs.readFileSync(newPath, 'utf8'),
            map: null,
          }
        }
      }
    },
    buildEnd() {
      if (customPaths.length && !isDevelopment) {
        this.warn(`
======================================================

             WARNING:
Custom files aren't officially supported
Be sure to watch for breaking changes!

${customPaths.map((x, i) => ` ${i + 1}. src/${x.split('src/')[1]}`).join('\n')}

======================================================
`)
      }
    },
  }
}

module.exports = {
  customFilePlugin,
}

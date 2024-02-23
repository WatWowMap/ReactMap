// @ts-check
const { resolve } = require('path')
const fs = require('fs')

const { log, HELPERS } = require('@rm/logger')

/**
 * @param {boolean} isDevelopment
 * @returns {import('vite').Plugin}
 */
const faviconPlugin = (isDevelopment) => {
  const basePath = resolve(__dirname, '../../../public/favicon')
  const fallback = resolve(basePath, `fallback.ico`)
  const custom = process.env.NODE_CONFIG_ENV
    ? resolve(basePath, `${process.env.NODE_CONFIG_ENV}.ico`)
    : resolve(basePath, `favicon.ico`)
  const favicon = fs.existsSync(custom) ? custom : fallback
  return {
    name: 'vite-plugin-favicon',
    generateBundle() {
      if (isDevelopment) return
      try {
        this.emitFile({
          type: 'asset',
          fileName: 'favicon.ico',
          source: fs.readFileSync(favicon),
        })
      } catch (e) {
        log.error(HELPERS.build, 'Error loading favicon', e)
      }
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/favicon.ico') {
          res.writeHead(200, { 'Content-Type': 'image/x-icon' })
          res.end(fs.readFileSync(favicon))
          return
        }
        next()
      })
    },
  }
}

module.exports = {
  faviconPlugin,
}

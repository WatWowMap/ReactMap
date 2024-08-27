// @ts-check
const path = require('path')
const fs = require('fs')

const { log, TAGS } = require('@rm/logger')

/**
 * @param {boolean} isDevelopment
 * @returns {import('vite').Plugin}
 */
const faviconPlugin = (isDevelopment) => {
  const basePath = path.join(__dirname, '../../../public/favicon')
  const markerPath = path.join(
    __dirname,
    '../../../node_modules/leaflet/dist/images/marker-icon.png',
  )
  const fallback = path.join(basePath, `fallback.ico`)
  const custom = process.env.NODE_CONFIG_ENV
    ? path.join(basePath, `${process.env.NODE_CONFIG_ENV}.ico`)
    : path.join(basePath, `favicon.ico`)
  const favicon = fs.existsSync(custom) ? custom : fallback
  return {
    name: 'vite-plugin-favicon',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'images/fallback-marker.png',
        source: fs.readFileSync(markerPath),
      })
      if (isDevelopment) return
      try {
        this.emitFile({
          type: 'asset',
          fileName: 'favicon.ico',
          source: fs.readFileSync(favicon),
        })
      } catch (e) {
        log.error(TAGS.build, 'Error loading favicon', e)
      }
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/favicon.ico') {
          res.writeHead(200, { 'Content-Type': 'image/x-icon' })
          res.end(fs.readFileSync(favicon))
          return
        }
        if (req.url === '/images/fallback-marker.png') {
          res.writeHead(200, { 'Content-Type': 'image/png' })
          res.end(fs.readFileSync(markerPath))
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

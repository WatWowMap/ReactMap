// @ts-check
const path = require('path')
const fs = require('fs')

const { log, TAGS } = require('@rm/logger')

const configDir = path.join(__dirname, '../../config/user/public')

/**
 * @returns {import('vite').Plugin}
 */
const publicPlugin = () => {
  const markerPath = path.join(
    __dirname,
    '../../node_modules/leaflet/dist/images/marker-icon.png',
  )
  let outDir = ''
  return {
    name: 'vite-plugin-public',
    configResolved(config) {
      outDir = config.build.outDir
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'images/fallback-marker.png',
        source: fs.readFileSync(markerPath),
      })
    },
    async closeBundle() {
      if (fs.existsSync(configDir)) {
        log.info(TAGS.build, 'copying public folder from config')
        await fs.promises.cp(configDir, outDir, {
          recursive: true,
        })
      }
    },
    configureServer(server) {
      const customPath = process.env.NODE_CONFIG_ENV
        ? path.join(configDir, `favicon-${process.env.NODE_CONFIG_ENV}.ico`)
        : path.join(configDir, `favicon.ico`)
      const favicon = fs.existsSync(customPath)
        ? customPath
        : path.join(__dirname, '../public/favicon.ico')

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
        if (req.url.startsWith('/images/u')) {
          res.writeHead(200, { 'Content-Type': 'image/png' })
          res.end(fs.readFileSync(path.join(configDir, req.url)))
          return
        }
        next()
      })
    },
  }
}

module.exports = { publicPlugin }

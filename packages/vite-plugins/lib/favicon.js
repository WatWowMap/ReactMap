// @ts-check
const { resolve } = require('path')
const fs = require('fs')

const { log, HELPERS } = require('@rm/logger')

/**
 * @param {boolean} isDevelopment
 * @returns {import('vite').Plugin}
 */
const faviconPlugin = (isDevelopment) => {
  try {
    const basePath = '../../../public/favicon'
    const fallback = resolve(__dirname, `${basePath}/fallback.ico`)
    const singleDomainPath = resolve(`${basePath}/favicon.ico`)
    const multiDomainPath = resolve(
      `${basePath}/${
        process.env.NODE_CONFIG_ENV ? `-${process.env.NODE_CONFIG_ENV}` : ''
      }.ico`,
    )
    const favicon = fs.existsSync(multiDomainPath)
      ? multiDomainPath
      : fs.existsSync(singleDomainPath)
      ? singleDomainPath
      : fallback
    return {
      name: 'vite-plugin-favicon',
      generateBundle() {
        if (isDevelopment) return
        this.emitFile({
          type: 'asset',
          fileName: 'favicon.ico',
          source: fs.readFileSync(favicon),
        })
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
  } catch (e) {
    log.error(HELPERS.build, 'Error loading favicon', e)
    return { name: 'vite-plugin-favicon' }
  }
}

module.exports = {
  faviconPlugin,
}

// @ts-check
const path = require('path')
const fs = require('fs')

const { log, TAGS } = require('@rm/logger')

/** Sizes we ship a `fallback-{size}.png` for, admins may override each one */
const ICON_SIZES = [180, 192, 256, 512]

/**
 * @typedef {object} PwaOptions
 * @property {string} [name] Full app name, shown on the splash screen
 * @property {string} [shortName] Name shown under the home screen icon
 * @property {{ style?: string, primary?: string }} [theme]
 */

/**
 * @param {boolean} isDevelopment
 * @param {PwaOptions} [pwa]
 * @returns {import('vite').Plugin}
 */
const faviconPlugin = (isDevelopment, pwa = {}) => {
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

  /**
   * Mirrors the favicon.ico lookup for the PWA pngs:
   * `{NODE_CONFIG_ENV}-{suffix}.png` => `favicon-{suffix}.png` => `fallback-{suffix}.png`
   * @param {string | number} suffix
   * @param {boolean} [hasFallback]
   * @returns {string | null}
   */
  const resolveIcon = (suffix, hasFallback = true) => {
    const found = [
      ...(process.env.NODE_CONFIG_ENV
        ? [`${process.env.NODE_CONFIG_ENV}-${suffix}.png`]
        : []),
      `favicon-${suffix}.png`,
      ...(hasFallback ? [`fallback-${suffix}.png`] : []),
    ].find((file) => fs.existsSync(path.join(basePath, file)))
    return found ? path.join(basePath, found) : null
  }

  /**
   * Reads the dimensions straight out of the IHDR so an overridden icon reports
   * its real size instead of the one it was named after
   * @param {string} file
   * @returns {string}
   */
  const pngSize = (file) => {
    const header = Buffer.alloc(24)
    const fd = fs.openSync(file, 'r')
    try {
      fs.readSync(fd, header, 0, 24, 0)
    } finally {
      fs.closeSync(fd)
    }
    return `${header.readUInt32BE(16)}x${header.readUInt32BE(20)}`
  }

  const maskable = resolveIcon('maskable', false)

  /** @type {Record<string, string>} Emitted file name => source file */
  const icons = Object.fromEntries(
    [
      ...ICON_SIZES.map((size) => [
        size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`,
        resolveIcon(size),
      ]),
      ...(maskable ? [['icon-maskable.png', maskable]] : []),
    ].filter(([, file]) => !!file),
  )

  const theme = pwa.theme || {}
  const themeColor = theme.primary || '#ff5722'
  const manifest = JSON.stringify(
    {
      name: pwa.name || 'ReactMap',
      short_name: pwa.shortName || pwa.name || 'ReactMap',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: theme.style === 'light' ? '#fafafa' : '#212121',
      theme_color: themeColor,
      icons: Object.entries(icons)
        // Only the manifest icons, apple-touch-icon is linked from the html
        .filter(([fileName]) => fileName !== 'apple-touch-icon.png')
        .map(([fileName, file]) => ({
          src: `/${fileName}`,
          sizes: pngSize(file),
          type: 'image/png',
          purpose: fileName === 'icon-maskable.png' ? 'maskable' : 'any',
        })),
    },
    null,
    2,
  )

  return {
    name: 'vite-plugin-favicon',
    transformIndexHtml() {
      /** @type {import('vite').HtmlTagDescriptor[]} */
      const tags = [
        {
          tag: 'link',
          attrs: { rel: 'manifest', href: '/manifest.webmanifest' },
          injectTo: 'head',
        },
        {
          tag: 'meta',
          attrs: { name: 'theme-color', content: themeColor },
          injectTo: 'head',
        },
      ]
      if ('apple-touch-icon.png' in icons) {
        tags.push({
          tag: 'link',
          attrs: { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
          injectTo: 'head',
        })
      }
      return tags
    },
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
      try {
        Object.entries(icons).forEach(([fileName, file]) => {
          this.emitFile({
            type: 'asset',
            fileName,
            source: fs.readFileSync(file),
          })
        })
        this.emitFile({
          type: 'asset',
          fileName: 'manifest.webmanifest',
          source: manifest,
        })
      } catch (e) {
        log.error(TAGS.build, 'Error loading PWA icons', e)
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
        if (req.url === '/manifest.webmanifest') {
          res.writeHead(200, { 'Content-Type': 'application/manifest+json' })
          res.end(manifest)
          return
        }
        const icon = icons[(req.url || '').slice(1)]
        if (icon) {
          res.writeHead(200, { 'Content-Type': 'image/png' })
          res.end(fs.readFileSync(icon))
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

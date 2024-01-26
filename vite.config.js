// @ts-check
/* eslint-disable no-continue */
/* eslint-disable import/no-extraneous-dependencies */

const { defineConfig, loadEnv, createLogger } = require('vite')
const { default: react } = require('@vitejs/plugin-react')
const { default: checker } = require('vite-plugin-checker')
const removeFiles = require('rollup-plugin-delete')
const { resolve } = require('path')
const fs = require('fs')
const { sentryVitePlugin } = require('@sentry/vite-plugin')

const config = require('@rm/config')
const { log, HELPERS } = require('@rm/logger')
const { locales } = require('@rm/locales')
const {
  faviconPlugin,
  customFilePlugin,
  localePlugin,
  muteWarningsPlugin,
} = require('@rm/vite-plugins')

const defaultLogger = createLogger()
const logLevel = config.getSafe('devOptions.logLevel')
const viteLogLevel =
  logLevel === 'debug' || logLevel === 'trace' ? 'info' : logLevel

const viteConfig = defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(process.cwd(), './'), '')
  const isRelease = process.argv.includes('-r')
  const isDevelopment = mode === 'development'
  const serverPort = +(env.PORT || config.getSafe('port') || '8080')

  const pkg = JSON.parse(
    fs.readFileSync(resolve(__dirname, 'package.json'), 'utf8'),
  )
  const version = env.npm_package_version || pkg.version
  const hasCustom = (function checkFolders(folder, isCustom = false) {
    const files = fs.readdirSync(folder)
    for (let i = 0; i < files.length; i += 1) {
      if (isCustom) return true
      if (files[i].startsWith('.')) continue
      if (!files[i].includes('.'))
        isCustom = checkFolders(`${folder}/${files[i]}`, isCustom)
      if (/\.custom.(jsx?|css)$/.test(files[i])) return true
    }
    return isCustom
  })(resolve(__dirname, 'src'))

  if (mode === 'production') {
    log.info(HELPERS.build, `Building production version: ${version}`)
  }

  if (env.GOOGLE_ANALYTICS_ID) {
    log.warn(
      HELPERS.build,
      'The .env file has been deprecated, please move your Google Analytics ID to your config file as this functionality will be removed in the future.',
    )
  }

  const sentry = config.getSafe('sentry.client')
  sentry.enabled = sentry.enabled || !!env.SENTRY_DSN
  if (env.SENTRY_AUTH_TOKEN) sentry.authToken = env.SENTRY_AUTH_TOKEN
  if (env.SENTRY_ORG) sentry.org = env.SENTRY_ORG
  if (env.SENTRY_PROJECT) sentry.project = env.SENTRY_PROJECT
  if (env.SENTRY_DSN) sentry.dsn = env.SENTRY_DSN
  if (env.SENTRY_TRACES_SAMPLE_RATE)
    sentry.tracesSampleRate = +env.SENTRY_TRACES_SAMPLE_RATE || 0.1
  if (env.SENTRY_DEBUG) sentry.debug = !!env.SENTRY_DEBUG

  return {
    plugins: [
      react({
        jsxRuntime: 'classic',
      }),
      ...(isDevelopment
        ? [
            checker({
              overlay: {
                initialIsOpen: false,
              },
              eslint: {
                lintCommand: 'eslint "./src/**/*.{js,jsx}"',
              },
            }),
          ]
        : []),
      ...(hasCustom ? [customFilePlugin(isDevelopment)] : []),
      ...(sentry.authToken && sentry.org && sentry.project
        ? [
            sentryVitePlugin({
              org: sentry.org,
              project: sentry.project,
              authToken: sentry.authToken,
            }),
          ]
        : []),
      localePlugin(isDevelopment),
      faviconPlugin(isDevelopment),
      muteWarningsPlugin([
        ['SOURCEMAP_ERROR', "Can't resolve original location of error"],
      ]),
    ],
    optimizeDeps: isDevelopment ? { exclude: ['@mui/*'] } : undefined,
    publicDir: 'public',
    resolve: {
      alias: {
        '@components': resolve(__dirname, './src/components'),
        '@assets': resolve(__dirname, './src/assets'),
        '@hooks': resolve(__dirname, './src/hooks'),
        '@services': resolve(__dirname, './src/services'),
      },
    },
    define: {
      CONFIG: {
        client: {
          version,
          locales,
          hasCustom,
          title: config.getSafe('map.general.headerTitle'),
        },
        sentry: { client: sentry },
        googleAnalyticsId:
          config.getSafe('googleAnalyticsId') || env.GOOGLE_ANALYTICS_ID || '',
        map: {
          general: {
            startLat: config.getSafe('map.general.startLat'),
            startLon: config.getSafe('map.general.startLon'),
            startZoom: config.getSafe('map.general.startZoom'),
          },
        },
      },
    },
    esbuild: {
      legalComments: 'none',
    },
    build: {
      target: ['safari11.1', 'chrome64', 'firefox66', 'edge88'],
      outDir: resolve(__dirname, './dist'),
      sourcemap: isRelease || isDevelopment ? true : 'hidden',
      minify:
        isDevelopment || config.getSafe('devOptions.skipMinified')
          ? false
          : 'esbuild',
      input: { main: resolve(__dirname, 'index.html') },
      assetsDir: '',
      emptyOutDir: true,
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        plugins: [
          // @ts-ignore
          removeFiles({
            targets: ['dist/favicon'],
            hook: 'generateBundle',
          }),
        ],
        output: {
          manualChunks: (id) => {
            if (id.endsWith('.css')) return 'index'
            if (id.includes('node_modules')) return 'vendor'
            // return id.replace(/.*node_modules\//, '').split('/')[0]
            if (id.includes('src')) return version.replaceAll('.', '-')
          },
        },
      },
    },
    logLevel: viteLogLevel,
    customLogger: {
      ...defaultLogger,
      error: (message) => log.error(HELPERS.build, message),
      warn: (message) => log.warn(HELPERS.build, message),
      info: (message) => log.info(HELPERS.build, message),
      // debug: (message) => log.debug(HELPERS.build, message),
    },
    server: {
      host: '0.0.0.0',
      open: true,
      port: serverPort + 1,
      fs: {
        strict: false,
      },
      proxy: {
        '/api': {
          target: `http://0.0.0.0:${serverPort}`,
          changeOrigin: true,
          secure: false,
        },
        '/auth': {
          target: `http://0.0.0.0:${serverPort}`,
          changeOrigin: true,
          secure: false,
        },
        '/graphql': {
          target: `http://0.0.0.0:${serverPort}`,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})

module.exports = viteConfig

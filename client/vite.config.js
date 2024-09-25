// @ts-check

const { defineConfig, loadEnv, createLogger } = require('vite')
const { default: react } = require('@vitejs/plugin-react-swc')
const { default: checker } = require('vite-plugin-checker')
const removeFiles = require('rollup-plugin-delete')
const path = require('path')
const fs = require('fs')
const { sentryVitePlugin } = require('@sentry/vite-plugin')

const config = require('@rm/config')
const { log, TAGS } = require('@rm/logger')
const { locales, status } = require('@rm/locales')
const { customFilePlugin } = require('./plugins/customFile')
const { localePlugin } = require('./plugins/locale')
const { publicPlugin } = require('./plugins/public')
const { muteWarningsPlugin } = require('./plugins/muteWarnings')

const defaultLogger = createLogger()
const logLevel = config.getSafe('devOptions.logLevel')
const viteLogLevel =
  logLevel === 'debug' || logLevel === 'trace' ? 'info' : logLevel

const viteConfig = defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.join(process.cwd(), './'), '')
  const isRelease = process.argv.includes('-r')
  const isDevelopment = mode === 'development'
  const serverPort = +(env.PORT || config.getSafe('port') || '8080')

  const { version } = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'),
  )
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
  })(path.join(__dirname, 'src'))

  if (mode === 'production') {
    log.info(TAGS.build, `Building production version: ${version}`)
  }

  if (env.GOOGLE_ANALYTICS_ID) {
    log.warn(
      TAGS.build,
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

  const outDir = path.join(
    __dirname,
    `../dist${
      process.env.NODE_CONFIG_ENV ? `-${process.env.NODE_CONFIG_ENV}` : ''
    }`,
  )
  return {
    root: __dirname,
    mode,
    configFile: process.env.SKIP_CONFIG ? false : undefined,
    plugins: [
      react(),
      ...(isDevelopment
        ? [
            checker({
              overlay: {
                initialIsOpen: false,
              },
              // typescript: {
              //   tsconfigPath: './jsconfig.json',
              // },
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
      publicPlugin(),
      muteWarningsPlugin([
        ['SOURCEMAP_ERROR', "Can't resolve original location of error"],
      ]),
    ],
    optimizeDeps: isDevelopment ? { exclude: ['@mui/*'] } : undefined,
    publicDir: path.join(__dirname, 'public'),
    resolve: {
      alias: {
        '@assets': path.join(__dirname, './src/assets'),
        '@components': path.join(__dirname, './src/components'),
        '@features': path.join(__dirname, './src/features'),
        '@hooks': path.join(__dirname, './src/hooks'),
        '@services': path.join(__dirname, './src/services'),
        '@utils': path.join(__dirname, './src/utils'),
        '@store': path.join(__dirname, './src/store'),
      },
    },
    define: {
      CONFIG: {
        client: {
          version,
          locales,
          localeStatus: status,
          hasCustom,
          title: config.getSafe('map.general.headerTitle'),
        },
        sentry: {
          client: {
            enabled: sentry.enabled,
            dsn: sentry.dsn,
            tracesSampleRate: sentry.tracesSampleRate,
            debug: sentry.debug,
          },
        },
        googleAnalyticsId:
          config.getSafe('googleAnalyticsId') || env.GOOGLE_ANALYTICS_ID || '',
        map: {
          general: {
            startLat: config.getSafe('map.general.startLat'),
            startLon: config.getSafe('map.general.startLon'),
            startZoom: config.getSafe('map.general.startZoom'),
          },
          theme: config.getSafe('map.theme'),
        },
        api: {
          polling: config.getSafe('api.polling'),
        },
      },
    },
    esbuild: {
      legalComments: 'none',
    },
    build: {
      target: ['safari11.1', 'chrome64', 'firefox66', 'edge88'],
      outDir,
      sourcemap: isRelease || isDevelopment ? true : 'hidden',
      minify:
        isDevelopment || config.getSafe('devOptions.skipMinified')
          ? false
          : 'esbuild',
      assetsDir: '',
      emptyOutDir: true,
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        plugins: [
          // @ts-ignore
          removeFiles({
            targets: [`${outDir}/favicon`],
            hook: 'generateBundle',
            force: true,
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
      error: (message) => log.error(TAGS.build, message),
      warn: (message) => log.warn(TAGS.build, message),
      info: (message) => log.info(TAGS.build, message),
      // debug: (message) => log.debug(TAGS.build, message),
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

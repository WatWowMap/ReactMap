// @ts-check
/* eslint-disable no-continue */
/* eslint-disable import/no-extraneous-dependencies */

const { defineConfig, loadEnv, createLogger } = require('vite')
const { default: react } = require('@vitejs/plugin-react-swc')
const { default: tailwindcss } = require('@tailwindcss/vite')
const { default: checker } = require('vite-plugin-checker')
const removeFiles = require('rollup-plugin-delete')
const { resolve } = require('path')
const fs = require('fs')
const { sentryVitePlugin } = require('@sentry/vite-plugin')

const config = require('@rm/config')
const { log, TAGS } = require('@rm/logger')
const { locales, status } = require('@rm/locales')
const {
  faviconPlugin,
  localePlugin,
  muteWarningsPlugin,
} = require('@rm/vite-plugins')

const defaultLogger = createLogger()
const logLevel = config.getSafe('devOptions.logLevel')
const viteLogLevel =
  logLevel === 'debug' || logLevel === 'trace' ? 'info' : logLevel

const viteConfig = defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(process.cwd(), './'), '')
  const appDir = `${resolve(__dirname, 'app')}/`
  const isRelease = process.argv.includes('-r')
  const isDevelopment = mode === 'development'
  const serverPort = +(env.PORT || config.getSafe('port') || '8080')

  const pkg = JSON.parse(
    fs.readFileSync(resolve(__dirname, 'package.json'), 'utf8'),
  )
  const resolvedVersion = env.npm_package_version || pkg.version
  const version = isDevelopment ? 'development' : resolvedVersion

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

  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(isDevelopment
        ? [
            checker({
              overlay: {
                initialIsOpen: false,
              },
              typescript: {
                tsconfigPath: './tsconfig.app.json',
              },
            }),
          ]
        : []),
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
        '@assets': resolve(__dirname, './src/assets'),
        '@components': resolve(__dirname, './src/components'),
        '@features': resolve(__dirname, './src/features'),
        '@hooks': resolve(__dirname, './src/hooks'),
        '@services': resolve(__dirname, './src/services'),
        '@utils': resolve(__dirname, './src/utils'),
        '@store': resolve(__dirname, './src/store'),
        '@app': resolve(__dirname, './app'),
      },
    },
    define: {
      CONFIG: {
        client: {
          version,
          locales,
          localeStatus: status,
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
      outDir: resolve(
        __dirname,
        `./dist${
          process.env.NODE_CONFIG_ENV ? `-${process.env.NODE_CONFIG_ENV}` : ''
        }`,
      ),
      sourcemap: isRelease || isDevelopment ? true : 'hidden',
      minify:
        isDevelopment || config.getSafe('devOptions.skipMinified')
          ? false
          : 'esbuild',
      assetsDir: '',
      emptyOutDir: true,
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          app: resolve(__dirname, 'app.html'),
        },
        plugins: [
          // @ts-expect-error
          removeFiles({
            targets: ['dist/favicon'],
            hook: 'generateBundle',
          }),
        ],
        output: {
          manualChunks: (id) => {
            // MapLibre is only ever imported from app/map, behind the /map
            // route's own lazy() call, so it needs a bucket of its own.
            // Grouping it into the same 'vendor'/'index' buckets as
            // everything else would put it behind app.html's unconditional
            // modulepreload of vendor (every 2.0 route) or, for its CSS,
            // behind index.html's stylesheet (every 1.0 route too) -
            // either way a visitor who never opens /map would pay for it.
            if (id.includes('node_modules/maplibre-gl')) return 'maplibre'
            // deck.gl is the same story: only ever reached from app/map,
            // behind /map's lazy() call. Left ungrouped it falls into the
            // generic 'vendor' check below, which app.html preloads on
            // every 2.0 route - confirmed by build output before this rule
            // existed, where deck.gl's ~1.4MB landed in vendor and pushed
            // every route's preload past 2.2MB, not just /map's.
            // deck.gl's rendering engine ships under separate npm scopes, so
            // matching only its own name left luma.gl, math.gl and loaders.gl
            // falling through to the generic vendor bucket that every entry
            // preloads, the 1.0 hub included. Measured at the time: 414 kB
            // raw and 118 kB gzipped of WebGL engine in front of visitors who
            // never open the map.
            //
            // Enumerating scopes is fragile, and this is the fourth thing to
            // leak through this rule after tailwind's preflight, the font
            // faces and maplibre's stylesheet. The durable fix is to stop
            // bucketing by path prefix and let rollup place modules by which
            // entry reaches them, but dropping the vendor catch-all changes
            // the chunk 1.0 users are served, so that wants its own change
            // with its own verification rather than riding along here.
            if (
              id.includes('node_modules/@deck.gl') ||
              id.includes('node_modules/deck.gl') ||
              id.includes('node_modules/@luma.gl') ||
              id.includes('node_modules/@math.gl') ||
              id.includes('node_modules/@loaders.gl') ||
              // deck.gl's gesture, logging and text dependencies sit under
              // scopes of their own again. Enumerating is how this rule keeps
              // failing: the fifth leak shipped in the same commit whose
              // comment predicted a fifth. Measured at the time, 43,773 bytes
              // of mjolnir.js, probe.gl and tiny-sdf were reaching every 1.0
              // visitor through the vendor catch-all below.
              id.includes('node_modules/mjolnir.js') ||
              id.includes('node_modules/@probe.gl') ||
              id.includes('node_modules/@mapbox/tiny-sdf')
            ) {
              return 'deckgl'
            }
            if (id.endsWith('.css')) {
              return id.startsWith(appDir) ? 'app' : 'index'
            }
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

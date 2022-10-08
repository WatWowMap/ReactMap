/* eslint-disable no-continue */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
const { resolve, extname } = require('path')
const fs = require('fs')
const dotenv = require('dotenv')
const { build: compile } = require('esbuild')
const { createServer } = require('esbuild-server')
const { htmlPlugin } = require('@craftamap/esbuild-plugin-html')
const esbuildMxnCopy = require('esbuild-plugin-mxn-copy')
const aliasPlugin = require('esbuild-plugin-path-alias')
const { eslintPlugin } = require('esbuild-plugin-eslinter')

const env = fs.existsSync(resolve(__dirname, '.env'))
  ? dotenv.config()
  : { parsed: process.env }
const { version } = JSON.parse(
  fs.readFileSync(resolve(__dirname, 'package.json')),
)
const isDevelopment = Boolean(process.argv.includes('--dev'))
const isRelease = Boolean(process.argv.includes('--release'))
const isServing = Boolean(process.argv.includes('--serve'))

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

if (fs.existsSync(resolve(__dirname, 'dist'))) {
  console.log('[BUILD] Cleaning up old build')
  fs.rm(resolve(__dirname, 'dist'), { recursive: true }, (err) => {
    if (err) console.log(err)
  })
}

const plugins = [
  htmlPlugin({
    files: [
      {
        entryPoints: ['src/index.jsx'],
        filename: 'index.html',
        htmlTemplate: fs.readFileSync(resolve(__dirname, 'public/index.html')),
        scriptLoading: 'defer',
        favicon: fs.existsSync(resolve(__dirname, 'public/favicon/favicon.ico'))
          ? resolve(__dirname, 'public/favicon/favicon.ico')
          : resolve(__dirname, 'public/favicon/fallback.ico'),
        extraScripts: isServing
          ? [{ src: '/esbuild-livereload.js', attrs: { async: true } }]
          : undefined,
      },
    ],
  }),
  esbuildMxnCopy({
    copy: [
      { from: resolve(__dirname, './public/images'), to: 'dist/' },
      { from: resolve(__dirname, './public/locales'), to: 'dist/' },
    ],
  }),
  aliasPlugin({
    '@components': resolve(__dirname, './src/components'),
    '@assets': resolve(__dirname, './src/assets'),
    '@hooks': resolve(__dirname, './src/hooks'),
    '@services': resolve(__dirname, './src/services'),
  }),
]

if (isDevelopment) {
  plugins.push(eslintPlugin())
} else {
  if (hasCustom) {
    plugins.push({
      name: 'Custom Loader',
      setup(build) {
        const customPaths = []
        build.onLoad({ filter: /\.(jsx?|css)$/ }, async (args) => {
          const isNodeModule = /node_modules/.test(args.path)
          if (!isNodeModule) {
            const ext = extname(args.path)
            const newPath = args.path.replace(ext, `.custom${ext}`)
            // console.log(ext, newPath)
            if (fs.existsSync(newPath)) {
              customPaths.push(newPath)
              return {
                contents: fs.readFileSync(newPath, 'utf8'),
                loader: ext.replace('.', ''),
                watchFiles: isDevelopment ? [newPath] : undefined,
              }
            }
          }
        })
        build.onEnd(() => {
          if (customPaths.length && !isDevelopment) {
            console.log(`
======================================================
                       WARNING:
       Custom files aren't officially supported
        Be sure to watch for breaking changes!

${customPaths.map((x, i) => ` ${i + 1}. src/${x.split('src/')[1]}`).join('\n')}

======================================================
`)
          }
        })
      },
    })
  }
  console.log(`[BUILD] Building production version: ${version}`)
}

const esbuild = {
  entryPoints: ['src/index.jsx'],
  legalComments: 'none',
  bundle: true,
  outdir: 'dist/',
  publicPath: '/',
  entryNames: isDevelopment ? undefined : `[name]-${version}-[hash]`,
  metafile: true,
  minify: env.parsed.NO_MINIFIED ? false : isRelease || !isDevelopment,
  logLevel: isDevelopment ? 'info' : 'error',
  target: ['safari11.1', 'chrome64', 'firefox66', 'edge88'],
  watch: isDevelopment
    ? {
        onRebuild(error) {
          if (error) console.error('Recompiling failed:', error)
          else console.log('Recompiled successfully')
        },
      }
    : false,
  sourcemap: isRelease || isDevelopment,
  define: {
    inject: JSON.stringify({
      GOOGLE_ANALYTICS_ID: env.parsed.GOOGLE_ANALYTICS_ID || '',
      ANALYTICS_DEBUG_MODE: env.parsed.ANALYTICS_DEBUG_MODE || false,
      TITLE: env.parsed.TITLE || env.parsed.MAP_GENERAL_TITLE || '',
      SENTRY_DSN: env.parsed.SENTRY_DSN || '',
      SENTRY_TRACES_SAMPLE_RATE: env.parsed.SENTRY_TRACES_SAMPLE_RATE || 0.1,
      SENTRY_DEBUG: env.parsed.SENTRY_DEBUG || false,
      VERSION: version,
      DEVELOPMENT: isDevelopment,
      CUSTOM: hasCustom,
      LOCALES: fs.readdirSync(resolve(__dirname, 'public/locales')),
    }),
  },
  plugins,
}

try {
  if (isServing) {
    if (!env.parsed.DEV_PORT)
      throw new Error(
        'DEV_PORT is not set, in .env file, it should match the port you set in your config',
      )
    createServer(esbuild, {
      port: +env.parsed.DEV_PORT + 1,
      static: 'public',
      open: true,
      proxy: {
        '/': `http://localhost:${env.parsed.DEV_PORT}`,
      },
    }).start()
  } else {
    compile(esbuild).then(() => console.log('[BUILD] React Map Compiled'))
  }
} catch (e) {
  console.error(e)
  process.exit(1)
}

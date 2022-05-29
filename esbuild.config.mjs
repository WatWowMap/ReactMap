/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { build as compile } from 'esbuild'
import { createServer } from 'esbuild-server'
import { htmlPlugin } from '@craftamap/esbuild-plugin-html'
import esbuildMxnCopy from 'esbuild-plugin-mxn-copy'
import aliasPlugin from 'esbuild-plugin-path-alias'
import { eslintPlugin } from 'esbuild-plugin-eslinter'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const env = fs.existsSync(`${__dirname}/.env`) ? dotenv.config() : { parsed: process.env }
const { version } = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json')))
const isDevelopment = Boolean(process.argv.includes('--dev'))
const isRelease = Boolean(process.argv.includes('--release'))
const isServing = Boolean(process.argv.includes('--serve'))

const hasCustom = await (async function checkFolders(folder, isCustom = false) {
  for (const file of await fs.promises.readdir(folder)) {
    if (isCustom) return true
    if (file.startsWith('.')) continue
    if (!file.includes('.')) isCustom = await checkFolders(`${folder}/${file}`, isCustom)
    if (/\.custom.(jsx?|css)$/.test(file)) return true
  }
  return isCustom
}(path.resolve(__dirname, 'src')))

if (fs.existsSync(path.resolve(__dirname, 'dist'))) {
  console.log('[BUILD] Cleaning up old build')
  fs.rm(path.resolve(__dirname, 'dist'), { recursive: true }, (err) => {
    if (err) console.log(err)
  })
}

const plugins = [
  htmlPlugin({
    files: [
      {
        entryPoints: ['src/index.jsx'],
        filename: 'index.html',
        htmlTemplate: fs.readFileSync(path.resolve(__dirname, './public/index.html')),
        scriptLoading: 'defer',
        favicon: fs.existsSync(path.resolve(__dirname, './public/favicon/favicon.ico'))
          ? path.resolve(__dirname, './public/favicon/favicon.ico')
          : path.resolve(__dirname, './public/favicon/fallback.ico'),
        extraScripts: isServing ? [
          { src: '/esbuild-livereload.js', attrs: { async: true } },
        ] : undefined,
      },
    ],
  }),
  esbuildMxnCopy({
    copy: [
      { from: path.resolve(__dirname, './public/images'), to: 'dist/' },
      { from: path.resolve(__dirname, './public/locales'), to: 'dist/' },
    ],
  }),
  aliasPlugin({
    '@components': path.resolve(__dirname, './src/components'),
    '@assets': path.resolve(__dirname, './src/assets'),
    '@hooks': path.resolve(__dirname, './src/hooks'),
    '@services': path.resolve(__dirname, './src/services'),
  }),
]

if (isDevelopment) {
  plugins.push(
    eslintPlugin(),
  )
} else {
  if (hasCustom) {
    plugins.push(
      {
        name: 'Custom Loader',
        setup(build) {
          const customPaths = []
          build.onLoad({ filter: /\.(jsx?|css)$/ }, async (args) => {
            const isNodeModule = /node_modules/.test(args.path)
            if (!isNodeModule) {
              const [base, suffix] = args.path.split('.')
              const newPath = `${base}.custom.${suffix}`
              if (fs.existsSync(newPath)) {
                customPaths.push(newPath)
                return {
                  contents: fs.readFileSync(newPath, 'utf8'),
                  loader: suffix,
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
      },
    )
  }
  console.log(`[BUILD] Building production version: ${version}`)
}

const esbuild = {
  entryPoints: ['src/index.jsx'],
  legalComments: 'none',
  bundle: true,
  outdir: 'dist/',
  publicPath: '/',
  entryNames: isDevelopment ? undefined : '[name].[hash]',
  metafile: true,
  minify: env.parsed.NO_MINIFIED
    ? false
    : isRelease || !isDevelopment,
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
      LOCALES: await fs.promises.readdir(`${__dirname}/public/locales`),
    }),
  },
  plugins,
}

try {
  if (isServing) {
    if (!env.parsed.DEV_PORT) throw new Error('DEV_PORT is not set, in .env file, it should match the port you set in your config')
    await createServer(
      esbuild,
      {
        port: +env.parsed.DEV_PORT + 1,
        static: 'public',
        open: true,
        proxy: {
          '/': `http://localhost:${env.parsed.DEV_PORT}`,
        },
      },
    ).start()
  } else {
    await compile(esbuild)
  }
} catch (e) {
  console.error(e)
  process.exit(1)
} finally {
  console.log('[BUILD] React Map Compiled')
}

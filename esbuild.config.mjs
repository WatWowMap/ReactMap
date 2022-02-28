/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

import { build } from 'esbuild'
import { htmlPlugin } from '@craftamap/esbuild-plugin-html'
import esbuildMxnCopy from 'esbuild-plugin-mxn-copy'
import aliasPlugin from 'esbuild-plugin-path-alias'
import { eslintPlugin } from 'esbuild-plugin-eslinter'

const env = fs.existsSync('.env') ? dotenv.config() : { parsed: {} }
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const { version } = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json')))
const isDevelopment = Boolean(process.argv.includes('--dev'))
const isRelease = Boolean(process.argv.includes('--release'))

if (fs.existsSync(path.resolve(__dirname, 'dist'))) {
  console.log('Cleaning up old build')
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
        htmlTemplate: fs.readFileSync('./public/index.template.html'),
        scriptLoading: 'defer',
        favicon: './public/favicon/favicon.ico',
      },
    ],
  }),
  esbuildMxnCopy({
    copy: [
      { from: 'public/images', to: 'dist/' },
      { from: 'public/locales', to: 'dist/' },
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
  plugins.push(
    {
      name: 'Compiling Plugin',
      setup(b) {
        b.onStart(() => {
          console.log(`Building production version: ${version}`)
        })
      },
    },
  )
}

try {
  await build({
    entryPoints: ['src/index.jsx'],
    legalComments: 'none',
    bundle: true,
    outdir: 'dist/',
    publicPath: '/',
    entryNames: isDevelopment ? undefined : '[name].[hash]',
    metafile: true,
    minify: isRelease || !isDevelopment,
    logLevel: isDevelopment ? 'info' : 'error',
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
        ...env.parsed,
        VERSION: version,
        DEVELOPMENT: isDevelopment,
      }),
    },
    plugins,
  })
} catch (e) {
  console.error(e)
  process.exit(1)
} finally {
  console.log('React Map Compiled')
}

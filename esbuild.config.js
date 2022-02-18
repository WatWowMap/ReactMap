/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */

const fs = require('fs')
const aliasPlugin = require('esbuild-plugin-path-alias')
const path = require('path')
const esbuildMxnCopy = require('esbuild-plugin-mxn-copy')
const { htmlPlugin } = require('@craftamap/esbuild-plugin-html')
const dotenv = fs.existsSync('.env')
  ? require('dotenv').config()
  : { parsed: {} }

const { version } = require('./package.json')

const isDevelopment = Boolean(process.argv[2] === '--dev')
console.log(
  `Building ${isDevelopment ? 'development' : 'production'} version ${version}`
)

const compilingPlugin = {
  name: 'Compiling Plugin',
  setup(build) {
    build.onStart(() => {
      console.log('Compiling...')
    })
  },
}

require('esbuild')
  .build({
    entryPoints: ['src/index.jsx'],
    legalComments: 'none',
    bundle: true,
    outdir: 'dist/',
    metafile: true,
    minify: !isDevelopment,
    watch: isDevelopment
      ? {
        onRebuild(error) {
          if (error) console.error('Recompiling failed:', error)
          else console.log('Recompiled')
        },
      }
      : false,
    sourcemap: isDevelopment,
    define: {
      'process.env': JSON.stringify({
        ...dotenv.parsed,
        VERSION: version,
        DEVELOPMENT: process.env.NODE_ENV === 'development',
      }),
    },
    plugins: [
      compilingPlugin,
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
    ],
  })
  .catch(() => process.exit(1))
  .then(() => console.log('React Map Compiled'))

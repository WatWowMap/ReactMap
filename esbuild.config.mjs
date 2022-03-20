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
import { htmlPlugin } from '@craftamap/esbuild-plugin-html'
import esbuildMxnCopy from 'esbuild-plugin-mxn-copy'
import aliasPlugin from 'esbuild-plugin-path-alias'
import { eslintPlugin } from 'esbuild-plugin-eslinter'

const env = fs.existsSync('.env') ? dotenv.config() : { parsed: {} }
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const { version } = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json')))
const isDevelopment = Boolean(process.argv.includes('--dev'))
const isRelease = Boolean(process.argv.includes('--release'))

const hasCustom = await (async function checkFolders(folder, isCustom = false) {
  for (const file of await fs.promises.readdir(folder)) {
    if (file.startsWith('.')) continue
    if (!file.includes('.')) isCustom = await checkFolders(`${folder}/${file}`, isCustom)
    if (/\.custom.(jsx?|css)$/.test(file)) return true
  }
  return isCustom
}(`${__dirname}/src`))

if (await fs.existsSync(path.resolve(__dirname, 'dist'))) {
  console.log('Cleaning up old build')
  await fs.rm(path.resolve(__dirname, 'dist'), { recursive: true }, (err) => {
    if (err) console.log(err)
  })
}

const plugins = [
  htmlPlugin({
    files: [
      {
        entryPoints: ['src/index.jsx'],
        filename: 'index.html',
        htmlTemplate: await fs.readFileSync('./public/index.template.html'),
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
              if (await fs.existsSync(newPath)) {
                customPaths.push(newPath)
                return {
                  contents: await fs.readFileSync(newPath, 'utf8'),
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
  console.log(`Building production version: ${version}`)
}

try {
  await compile({
    entryPoints: ['src/index.jsx'],
    legalComments: 'none',
    bundle: true,
    outdir: 'dist/',
    publicPath: '/',
    entryNames: isDevelopment ? undefined : '[name].[hash]',
    metafile: true,
    minify: isRelease || !isDevelopment,
    logLevel: isDevelopment ? 'info' : 'error',
    target: [
      'safari11',
      'chrome64',
      'firefox58',
      'edge88',
    ],
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
        CUSTOM: hasCustom,
        LOCALES: await fs.promises.readdir(`${__dirname}/public/locales`),
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

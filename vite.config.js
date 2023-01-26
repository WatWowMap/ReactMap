// @ts-check
/* eslint-disable no-console */
/* eslint-disable no-continue */
/* eslint-disable import/no-extraneous-dependencies */
const { defineConfig, loadEnv } = require('vite')
const { default: react } = require('@vitejs/plugin-react')
const { default: checker } = require('vite-plugin-checker')
const { viteStaticCopy } = require('vite-plugin-static-copy')
const removeFiles = require('rollup-plugin-delete')
const { resolve, extname } = require('path')
const fs = require('fs')

const customFilePlugin = (isDevelopment) => {
  const fileRegex = /\.(jsx?|css)$/
  const customPaths = []
  return {
    name: 'vite-plugin-custom-file-checker',
    load(id) {
      if (fileRegex.test(id) && !/node_modules/.test(id)) {
        const ext = extname(id)
        const newPath = id.replace(ext, `.custom${ext}`)
        if (fs.existsSync(newPath)) {
          customPaths.push(newPath)
          return {
            code: fs.readFileSync(newPath, 'utf8'),
            map: null,
          }
        }
      }
    },
    buildEnd() {
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
    },
  }
}

module.exports = defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(process.cwd(), './'), '')

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
    console.log(`[BUILD] Building production version: ${version}`)
  }

  return {
    plugins: [
      react({
        jsxRuntime: 'classic',
      }),
      ...(mode === 'development'
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
      ...(hasCustom ? [customFilePlugin(mode === 'development')] : []),
      viteStaticCopy({
        targets: [
          {
            src: fs.existsSync(resolve(__dirname, 'public/favicon/favicon.ico'))
              ? resolve(__dirname, 'public/favicon/favicon.ico')
              : resolve(__dirname, 'public/favicon/fallback.ico'),
            dest: '.',
            rename: 'favicon.ico',
          },
        ],
      }),
    ],
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
      inject: JSON.stringify({
        GOOGLE_ANALYTICS_ID: env.GOOGLE_ANALYTICS_ID || '',
        ANALYTICS_DEBUG_MODE: env.ANALYTICS_DEBUG_MODE || false,
        TITLE: env.TITLE || env.MAP_GENERAL_TITLE || '',
        SENTRY_DSN: env.SENTRY_DSN || '',
        SENTRY_TRACES_SAMPLE_RATE: env.SENTRY_TRACES_SAMPLE_RATE || 0.1,
        SENTRY_DEBUG: env.SENTRY_DEBUG || false,
        VERSION: version,
        DEVELOPMENT: mode === 'development',
        CUSTOM: hasCustom,
        LOCALES: fs.readdirSync(resolve(__dirname, 'public/locales')),
      }),
    },
    esbuild: {
      legalComments: 'none',
    },
    build: {
      target: ['safari11.1', 'chrome64', 'firefox66', 'edge88'],
      outDir: resolve(__dirname, './dist'),
      sourcemap: mode === 'development',
      minify: mode === 'development' ? false : 'esbuild',
      input: { main: resolve(__dirname, 'index.html') },
      assetsDir: '',
      emptyOutDir: true,
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        plugins: [
          // @ts-ignore
          removeFiles({
            targets: ['dist/base-locales', 'dist/favicon'],
            hook: 'generateBundle',
          }),
        ],
        output: {
          manualChunks: (id) => {
            if (id.endsWith('.css')) return 'index'
            if (id.includes('node_modules')) return 'vendor'
            if (id.includes('src')) return version.replaceAll('.', '-')
          },
        },
      },
    },
    server: {
      host: '0.0.0.0',
      open: true,
      port: +(env.PORT || '8080') + 1,
      fs: {
        strict: false,
      },
      proxy: {
        '/api': {
          target: `http://0.0.0.0:${env.PORT || 8080}`,
          changeOrigin: true,
          secure: false,
        },
        '/auth': {
          target: `http://0.0.0.0:${env.PORT || 8080}`,
          changeOrigin: true,
          secure: false,
        },
        '/graphql': {
          target: `http://0.0.0.0:${env.PORT || 8080}`,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})

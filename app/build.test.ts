import { expect, test } from 'bun:test'
import { resolve } from 'path'

// Asserting on the Vite config rather than dist/ artifacts: CI runs the
// test step before the build step (fresh checkout, no dist/), so a test
// that stats dist/index.html and dist/app.html would fail red in CI even
// on a correct build. The build itself is still proven end to end by the
// CI Build step, which fails if either entry breaks.
async function loadRollupInput() {
  const viteConfigModule = require('../vite.config.js')
  const resolved =
    typeof viteConfigModule === 'function'
      ? viteConfigModule
      : viteConfigModule.default
  const config = await resolved({ mode: 'production', command: 'build' })
  return config.build.rollupOptions.input as Record<string, string>
}

test('the vite config keeps the 1.0 entry', async () => {
  const input = await loadRollupInput()
  expect(input.main).toContain('index.html')
})

test('the vite config adds the 2.0 entry', async () => {
  const input = await loadRollupInput()
  expect(input.app).toContain('app.html')
})

test('the app entry CSS gets its own chunk, separate from the 1.0 CSS', async () => {
  const viteConfigModule = require('../vite.config.js')
  const resolved =
    typeof viteConfigModule === 'function'
      ? viteConfigModule
      : viteConfigModule.default
  const config = await resolved({ mode: 'production', command: 'build' })
  const { manualChunks } = config.build.rollupOptions.output
  const appCssId = resolve(__dirname, '../app/styles.css')
  const legacyCssId = resolve(__dirname, '../src/assets/css/main.css')

  const appChunk = manualChunks(appCssId)
  const legacyChunk = manualChunks(legacyCssId)

  expect(appChunk).not.toBe(legacyChunk)
  expect(legacyChunk).toBe('index')
})

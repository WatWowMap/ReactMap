import { expect, test } from 'bun:test'

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

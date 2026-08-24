import { afterEach, expect, test } from 'bun:test'
import { resolveBasemapStyle } from './basemap'

const ENV_KEY = 'VITE_BASEMAP_URL'
const original = process.env[ENV_KEY]

afterEach(() => {
  if (original === undefined) {
    delete process.env[ENV_KEY]
  } else {
    process.env[ENV_KEY] = original
  }
})

/*
 * These three cover the pure decision this module makes and nothing about
 * MapLibre itself: rendering a WebGL canvas needs a real browser, so that
 * part is left to manual/browser verification and is not asserted here.
 */

test('defaults to the keyless vector style when unconfigured', () => {
  delete process.env[ENV_KEY]
  const style = resolveBasemapStyle()
  expect(style).toBe('https://tiles.openfreemap.org/styles/liberty')
})

test('treats a {z}/{x}/{y} template as a raster tile source, not a style url', () => {
  process.env[ENV_KEY] = 'https://tile.example.com/{z}/{x}/{y}.png'
  const style = resolveBasemapStyle()
  expect(typeof style).not.toBe('string')
  if (typeof style === 'string') throw new Error('unreachable')
  expect(style.sources.basemap).toEqual({
    type: 'raster',
    tiles: ['https://tile.example.com/{z}/{x}/{y}.png'],
    tileSize: 256,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  })
  expect(style.layers).toEqual([
    { id: 'basemap', type: 'raster', source: 'basemap' },
  ])
})

test('passes a non-template url straight through as a vector style document url', () => {
  process.env[ENV_KEY] = 'https://example.com/my-style.json'
  const style = resolveBasemapStyle()
  expect(style).toBe('https://example.com/my-style.json')
})

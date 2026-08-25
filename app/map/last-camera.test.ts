import { afterAll, beforeAll, beforeEach, expect, test } from 'bun:test'
import { setupDom, teardownDom } from '../test-setup'
import {
  DEFAULT_CAMERA,
  LAST_CAMERA_KEY,
  readLastCamera,
  resolveInitialCamera,
  writeLastCamera,
} from './last-camera'

beforeAll(setupDom)
afterAll(teardownDom)
beforeEach(() => {
  window.localStorage.clear()
})

const STORED = { lat: 42.358, lon: -71.06, zoom: 17 }

test('url params win over a stored camera', () => {
  writeLastCamera(STORED)
  const camera = resolveInitialCamera(
    new URLSearchParams('lat=51.5&lon=-0.12&zoom=13'),
  )
  expect(camera).toEqual({ lat: 51.5, lon: -0.12, zoom: 13 })
})

test('a stored camera wins over the default when the url carries none', () => {
  writeLastCamera(STORED)
  expect(resolveInitialCamera(new URLSearchParams())).toEqual(STORED)
})

test('the default applies when nothing is stored and the url carries none', () => {
  expect(resolveInitialCamera(new URLSearchParams())).toEqual(DEFAULT_CAMERA)
})

test('a corrupt stored camera falls through to the default', () => {
  for (const corrupt of [
    'not json',
    '{}',
    '{"lat":"x","lon":0,"zoom":2}',
    '{"lat":null,"lon":null,"zoom":null}',
    '{"lat":0,"lon":0}',
    '[]',
    'null',
  ]) {
    window.localStorage.setItem(LAST_CAMERA_KEY, corrupt)
    expect(resolveInitialCamera(new URLSearchParams())).toEqual(DEFAULT_CAMERA)
  }
})

test('an out-of-range stored camera falls through to the default', () => {
  for (const corrupt of [
    { lat: 200, lon: 0, zoom: 2 },
    { lat: 0, lon: 400, zoom: 2 },
    { lat: 0, lon: 0, zoom: 99 },
    { lat: Number.NaN, lon: 0, zoom: 2 },
  ]) {
    window.localStorage.setItem(LAST_CAMERA_KEY, JSON.stringify(corrupt))
    expect(resolveInitialCamera(new URLSearchParams())).toEqual(DEFAULT_CAMERA)
  }
})

test('a camera change persists and reads back', () => {
  writeLastCamera({ lat: 1.5, lon: -2.25, zoom: 11.75 })
  expect(readLastCamera()).toEqual({ lat: 1.5, lon: -2.25, zoom: 11.75 })
})

test('a partial url camera fills its missing fields from the stored one', () => {
  writeLastCamera(STORED)
  expect(resolveInitialCamera(new URLSearchParams('lat=10&lon=20'))).toEqual({
    lat: 10,
    lon: 20,
    zoom: STORED.zoom,
  })
})

test('a non-numeric url param falls through rather than reaching NaN', () => {
  writeLastCamera(STORED)
  expect(
    resolveInitialCamera(new URLSearchParams('lat=abc&lon=-0.12&zoom=13')),
  ).toEqual({ lat: STORED.lat, lon: -0.12, zoom: 13 })
})

// server/src/services/poracle-human.test.ts
import { beforeEach, expect, test } from 'bun:test'
import {
  __resetHumanCache,
  checkHuman,
  resolveHumanState,
} from './poracle-human'

const ok = { get: async () => ({ status: 200, body: { id: '1' } }) } as any
const missing = { get: async () => ({ status: 404, body: null }) } as any
const down = {
  get: async () => {
    throw new Error('ECONNREFUSED')
  },
} as any

beforeEach(__resetHumanCache)

test('200 is present', async () => {
  expect(await checkHuman(ok, '123')).toBe('present')
})

test('404 is absent, which hides the tab entirely', async () => {
  expect(await checkHuman(missing, '123')).toBe('absent')
})

test('a transport failure is unreachable, which is not absent', async () => {
  expect(await checkHuman(down, '123')).toBe('unreachable')
})

test('unreachable keeps the last known answer', async () => {
  // A thirty second Poracle restart must not make the tab vanish for
  // everyone mid-session. This is the whole reason the answer is cached.
  expect(await resolveHumanState(ok, 'u1', '123')).toBe('present')
  expect(await resolveHumanState(down, 'u1', '123')).toBe('present')
})

test('a first-ever login during an outage gets no tab', async () => {
  // Nothing cached, so there is no last known answer to keep.
  expect(await resolveHumanState(down, 'u-new', '123')).toBe('unreachable')
})

test('an absent human is cached too, so a 404 is not re-fetched every load', async () => {
  expect(await resolveHumanState(missing, 'u2', '123')).toBe('absent')
  expect(await resolveHumanState(down, 'u2', '123')).toBe('absent')
})

// server/test/authTelegramGroups.test.js
const { test, expect } = require('bun:test')
const { fetchTelegramGroups } = require('../src/auth/telegram-groups')

test('the memberships list always includes the user id itself', async () => {
  const result = await fetchTelegramGroups('tok', [], 'u1', async () => {
    throw new Error('should not be called for an empty group list')
  })
  expect(result).toEqual(['u1'])
})

test('a group the user is a current member of is included', async () => {
  const result = await fetchTelegramGroups(
    'tok',
    ['g1'],
    'u1',
    async () => new Response(JSON.stringify({ result: { status: 'member' } })),
  )
  expect(result).toEqual(['u1', 'g1'])
})

test('a group the user left or was kicked from is excluded', async () => {
  const left = await fetchTelegramGroups(
    'tok',
    ['g1'],
    'u1',
    async () => new Response(JSON.stringify({ result: { status: 'left' } })),
  )
  expect(left).toEqual(['u1'])

  const kicked = await fetchTelegramGroups(
    'tok',
    ['g1'],
    'u1',
    async () => new Response(JSON.stringify({ result: { status: 'kicked' } })),
  )
  expect(kicked).toEqual(['u1'])
})

test('a group whose membership check fails (network error) is excluded without failing the whole call', async () => {
  const result = await fetchTelegramGroups(
    'tok',
    ['g1', 'g2'],
    'u1',
    async (url) => {
      if (url.includes('g1')) throw new Error('ECONNREFUSED')
      return new Response(JSON.stringify({ result: { status: 'member' } }))
    },
  )
  expect(result).toEqual(['u1', 'g2'])
})

test('a non-ok response is excluded without failing the whole call', async () => {
  const result = await fetchTelegramGroups(
    'tok',
    ['g1'],
    'u1',
    async () => new Response('{}', { status: 500 }),
  )
  expect(result).toEqual(['u1'])
})

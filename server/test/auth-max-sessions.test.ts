// server/test/authMaxSessions.test.ts
import { expect, test } from 'bun:test'
import { enforceMaxSessions } from '../src/auth/max-sessions'

test('does nothing when session count is at or under the cap', async () => {
  let deleted: string[] | null = null
  await enforceMaxSessions('u1', {
    maxSessions: 5,
    listSessionIds: async () => ['s1', 's2', 's3', 's4', 's5'],
    deleteSessions: async (ids: string[]) => {
      deleted = ids
    },
  })
  expect(deleted).toBeNull()
})

test('deletes only the oldest sessions beyond the cap', async () => {
  let deleted: string[] | null = null
  await enforceMaxSessions('u1', {
    maxSessions: 5,
    // oldest first, as the real query orders by createdAt asc
    listSessionIds: async () => ['s1', 's2', 's3', 's4', 's5', 's6', 's7'],
    deleteSessions: async (ids: string[]) => {
      deleted = ids
    },
  })
  expect(deleted as string[] | null).toEqual(['s1', 's2'])
})

test('a maxSessions of 0 or unset disables the cap entirely', async () => {
  let called = false
  await enforceMaxSessions('u1', {
    maxSessions: 0,
    listSessionIds: async () => {
      called = true
      return []
    },
    deleteSessions: async () => {
      called = true
    },
  })
  expect(called).toBe(false)
})

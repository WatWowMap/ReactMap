import { expect, test } from 'bun:test'

import { computeDiscordPerms } from '../auth/discord-perms'
import { alertsPerm } from './alerts-perms'

// Injected rather than mocked: bun applies `mock.module` process-wide, so a
// file that mocks `@rm/config` takes the real config away from every suite
// running after it. Every function under test here takes its config as a dep.
const PORACLE = {
  enabled: true,
  host: 'http://localhost',
  port: 3030,
  poracleSecret: 's',
  discordRoles: ['role-a'],
  telegramGroups: [] as string[],
  local: [] as string[],
}

test('a listed role grants alerts', () => {
  expect(alertsPerm(['role-a'], 'discordRoles', { config: PORACLE })).toBe(true)
})

test('an unlisted role does not', () => {
  expect(alertsPerm(['role-b'], 'discordRoles', { config: PORACLE })).toBe(
    false,
  )
})

test('a provider with no configured roles denies rather than throwing', () => {
  // telegramGroups is [], and a config that omits the key entirely must
  // behave the same way. 1.x relied on optional chaining here; losing it
  // turns a malformed config into a boot crash.
  expect(alertsPerm(['role-a'], 'telegramGroups', { config: PORACLE })).toBe(
    false,
  )
})

test('no roles is a denial, not a grant', () => {
  // The empty-means-everything idiom elsewhere in this repo (areaPerms)
  // must not leak into a grant.
  expect(alertsPerm([], 'discordRoles', { config: PORACLE })).toBe(false)
})

// The Discord grant lives here rather than beside the other Discord perm
// tests because computeDiscordPerms reaches config only through alertsPerm,
// and this is where that function's config shape is described.
const discordRules = {
  allowedUsers: [] as string[],
  allowedGuilds: ['good-guild'],
  blockedGuilds: [] as string[],
  permsConfig: { map: { enabled: true, roles: [] } },
  alwaysEnabledPerms: ['map'],
}

test('a Discord role listed under poracle.discordRoles grants alerts', () => {
  const perms = computeDiscordPerms(
    {
      id: 'u1',
      guildResults: { 'good-guild': { status: 'member', roles: ['role-a'] } },
    },
    discordRules,
    { poracleConfig: PORACLE },
  )
  expect(perms?.alerts).toBe(true)
})

test('a Discord account with no listed role is denied alerts', () => {
  const perms = computeDiscordPerms(
    {
      id: 'u1',
      guildResults: { 'good-guild': { status: 'member', roles: ['role-b'] } },
    },
    discordRules,
    { poracleConfig: PORACLE },
  )
  expect(perms?.alerts).toBe(false)
})

test('a non-member of every allowed guild still gets the key, set to false', () => {
  const perms = computeDiscordPerms(
    { id: 'u1', guildResults: { 'good-guild': { status: 'not_member' } } },
    discordRules,
    { poracleConfig: PORACLE },
  )
  expect(perms?.alerts).toBe(false)
})

test('an allowedUsers id gets alerts without any guild data', () => {
  const perms = computeDiscordPerms(
    { id: 'admin-1', guildResults: null },
    { ...discordRules, allowedUsers: ['admin-1'] },
    { poracleConfig: PORACLE },
  )
  expect(perms?.alerts).toBe(true)
})

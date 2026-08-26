import { expect, mock, test } from 'bun:test'

mock.module('@rm/config', () => ({
  default: {
    getSafe: (key: string) =>
      key === 'poracle'
        ? {
            enabled: true,
            host: 'http://localhost',
            port: 3030,
            poracleSecret: 's',
            discordRoles: ['role-a'],
            telegramGroups: [],
            local: [],
          }
        : undefined,
  },
}))

const { alertsPerm } = await import('./alerts-perms')

test('a listed role grants alerts', () => {
  expect(alertsPerm(['role-a'], 'discordRoles')).toBe(true)
})

test('an unlisted role does not', () => {
  expect(alertsPerm(['role-b'], 'discordRoles')).toBe(false)
})

test('a provider with no configured roles denies rather than throwing', () => {
  // telegramGroups is [], and a config that omits the key entirely must
  // behave the same way. 1.x relied on optional chaining here; losing it
  // turns a malformed config into a boot crash.
  expect(alertsPerm(['role-a'], 'telegramGroups')).toBe(false)
})

test('no roles is a denial, not a grant', () => {
  // The empty-means-everything idiom elsewhere in this repo (areaPerms)
  // must not leak into a grant.
  expect(alertsPerm([], 'discordRoles')).toBe(false)
})

// The Discord grant lives here rather than beside the other Discord perm
// tests because `mock.module` is process-wide in bun: a second file mocking
// `@rm/config` takes the real config away from every suite that runs after
// it. computeDiscordPerms reaches config only through alertsPerm, so this
// file's existing mock is all it needs.
const { computeDiscordPerms } = await import('../auth/discord-perms')

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
  )
  expect(perms?.alerts).toBe(false)
})

test('a non-member of every allowed guild still gets the key, set to false', () => {
  const perms = computeDiscordPerms(
    { id: 'u1', guildResults: { 'good-guild': { status: 'not_member' } } },
    discordRules,
  )
  expect(perms?.alerts).toBe(false)
})

test('an allowedUsers id gets alerts without any guild data', () => {
  const perms = computeDiscordPerms(
    { id: 'admin-1', guildResults: null },
    { ...discordRules, allowedUsers: ['admin-1'] },
  )
  expect(perms?.alerts).toBe(true)
})

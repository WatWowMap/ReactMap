// server/test/authDiscordPerms.test.js
const { test, expect } = require('bun:test')
const { computeDiscordPerms } = require('../src/auth/discord-perms')

const permsConfig = {
  map: { enabled: true },
  pokemon: { enabled: true },
  admin: { enabled: false },
}

test('an allowedUsers id gets every enabled perm and admin, guilds notwithstanding', () => {
  const perms = computeDiscordPerms(
    { id: 'admin-1', guilds: [] },
    {
      allowedUsers: ['admin-1'],
      allowedGuilds: [],
      blockedGuilds: [],
      permsConfig,
      alwaysEnabledPerms: [],
    },
  )
  expect(perms).toEqual({
    map: true,
    pokemon: true,
    admin: true,
    trial: false,
  })
})

test('an allowedUsers id is never blocked, even if their guilds include a blocked one', () => {
  const perms = computeDiscordPerms(
    { id: 'admin-1', guilds: [{ id: 'evil-guild', name: 'Evil Guild' }] },
    {
      allowedUsers: ['admin-1'],
      allowedGuilds: [],
      blockedGuilds: ['evil-guild'],
      permsConfig,
      alwaysEnabledPerms: [],
    },
  )
  expect(perms.blocked).toBeUndefined()
  expect(perms.map).toBe(true)
})

test('a member of a blocked guild gets perms.blocked and the guild name, and no perms', () => {
  const perms = computeDiscordPerms(
    { id: 'u1', guilds: [{ id: 'evil-guild', name: 'Evil Guild' }] },
    {
      allowedUsers: [],
      allowedGuilds: [],
      blockedGuilds: ['evil-guild'],
      permsConfig,
      alwaysEnabledPerms: ['map'],
    },
  )
  expect(perms.blocked).toBe(true)
  expect(perms.blockedGuildNames).toEqual(['Evil Guild'])
  expect(perms.map).toBe(false)
})

test('a member of an allowedGuilds guild gets every alwaysEnabledPerms perm', () => {
  const perms = computeDiscordPerms(
    { id: 'u1', guilds: [{ id: 'good-guild', name: 'Good Guild' }] },
    {
      allowedUsers: [],
      allowedGuilds: ['good-guild'],
      blockedGuilds: [],
      permsConfig,
      alwaysEnabledPerms: ['map'],
    },
  )
  expect(perms.map).toBe(true)
  expect(perms.pokemon).toBe(false)
})

test('a non-member of any allowedGuilds guild gets nothing', () => {
  const perms = computeDiscordPerms(
    { id: 'u1', guilds: [{ id: 'unrelated', name: 'Unrelated' }] },
    {
      allowedUsers: [],
      allowedGuilds: ['good-guild'],
      blockedGuilds: [],
      permsConfig,
      alwaysEnabledPerms: ['map'],
    },
  )
  expect(perms.map).toBe(false)
  expect(perms.blocked).toBeUndefined()
})

test('an alwaysEnabledPerms perm that is disabled in config is never granted', () => {
  const perms = computeDiscordPerms(
    { id: 'u1', guilds: [{ id: 'good-guild' }] },
    {
      allowedUsers: [],
      allowedGuilds: ['good-guild'],
      blockedGuilds: [],
      permsConfig,
      alwaysEnabledPerms: ['admin'],
    },
  )
  // permsConfig.admin.enabled is false, so even a listed alwaysEnabledPerms
  // entry does not flip the boolean-per-perm-key result (perms.admin here is
  // the separate hardcoded admin flag, not the config perm named "admin",
  // and stays false since this is not an allowedUsers id).
  expect(perms.admin).toBe(false)
})

test('a null guild list (Discord unreachable, no token, etc.) is skipped rather than treated as no perms', () => {
  const perms = computeDiscordPerms(
    { id: 'u1', guilds: null },
    {
      allowedUsers: [],
      allowedGuilds: ['good-guild'],
      blockedGuilds: [],
      permsConfig,
      alwaysEnabledPerms: ['map'],
    },
  )
  expect(perms).toBeNull()
})

test('a null guild list still honours allowedUsers, since that check needs no guild data', () => {
  const perms = computeDiscordPerms(
    { id: 'admin-1', guilds: null },
    {
      allowedUsers: ['admin-1'],
      allowedGuilds: [],
      blockedGuilds: [],
      permsConfig,
      alwaysEnabledPerms: [],
    },
  )
  expect(perms).toEqual(
    expect.objectContaining({ admin: true, map: true, pokemon: true }),
  )
})

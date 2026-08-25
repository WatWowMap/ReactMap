import { expect, test } from 'bun:test'
import { computeDiscordPerms } from '../src/auth/discord-perms'
import type { DiscordGuildResult } from '../src/auth/discord-roles'

const permsConfig = {
  map: { enabled: true, roles: [] },
  pokemon: { enabled: true, roles: ['pokemon-role'] },
  admin: { enabled: false, roles: [] },
}

const member = (roles: string[], guildName?: string): DiscordGuildResult =>
  guildName === undefined
    ? { status: 'member', roles }
    : { status: 'member', roles, guildName }
const notMember: DiscordGuildResult = { status: 'not_member' }

test('an allowedUsers id gets every enabled perm and admin, guildResults notwithstanding', () => {
  const perms = computeDiscordPerms(
    { id: 'admin-1', guildResults: {} },
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

test('an allowedUsers id is never blocked, even if member of a blocked guild', () => {
  const perms = computeDiscordPerms(
    { id: 'admin-1', guildResults: { 'evil-guild': member([], 'Evil Guild') } },
    {
      allowedUsers: ['admin-1'],
      allowedGuilds: [],
      blockedGuilds: ['evil-guild'],
      permsConfig,
      alwaysEnabledPerms: [],
    },
  )
  expect(perms!.blocked).toBeUndefined()
  expect(perms!.map).toBe(true)
})

test('an allowedUsers id needs no guild data at all -- honoured even when the bot could not be reached', () => {
  const perms = computeDiscordPerms(
    { id: 'admin-1', guildResults: null },
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

test('a member of a blocked guild gets perms.blocked and the guild name, and no perms', () => {
  const perms = computeDiscordPerms(
    { id: 'u1', guildResults: { 'evil-guild': member([], 'Evil Guild') } },
    {
      allowedUsers: [],
      allowedGuilds: [],
      blockedGuilds: ['evil-guild'],
      permsConfig,
      alwaysEnabledPerms: ['map'],
    },
  )
  expect(perms!.blocked).toBe(true)
  expect(perms!.blockedGuildNames).toEqual(['Evil Guild'])
  expect(perms!.map).toBe(false)
})

test('a non-member of a blocked guild is not blocked', () => {
  const perms = computeDiscordPerms(
    { id: 'u1', guildResults: { 'evil-guild': notMember } },
    {
      allowedUsers: [],
      allowedGuilds: [],
      blockedGuilds: ['evil-guild'],
      permsConfig,
      alwaysEnabledPerms: ['map'],
    },
  )
  expect(perms!.blocked).toBeUndefined()
})

test('a member of an allowedGuilds guild gets every alwaysEnabledPerms perm', () => {
  const perms = computeDiscordPerms(
    { id: 'u1', guildResults: { 'good-guild': member([], 'Good Guild') } },
    {
      allowedUsers: [],
      allowedGuilds: ['good-guild'],
      blockedGuilds: [],
      permsConfig,
      alwaysEnabledPerms: ['map'],
    },
  )
  expect(perms!.map).toBe(true)
  expect(perms!.pokemon).toBe(false)
})

test('a member of an allowedGuilds guild holding a mapped role gets that role-gated perm', () => {
  const perms = computeDiscordPerms(
    {
      id: 'u1',
      guildResults: { 'good-guild': member(['pokemon-role'], 'Good Guild') },
    },
    {
      allowedUsers: [],
      allowedGuilds: ['good-guild'],
      blockedGuilds: [],
      permsConfig,
      alwaysEnabledPerms: ['map'],
    },
  )
  expect(perms!.map).toBe(true)
  expect(perms!.pokemon).toBe(true)
})

test('a member holding none of the mapped roles gets only the always-enabled set', () => {
  const perms = computeDiscordPerms(
    {
      id: 'u1',
      guildResults: { 'good-guild': member(['unrelated-role'], 'Good Guild') },
    },
    {
      allowedUsers: [],
      allowedGuilds: ['good-guild'],
      blockedGuilds: [],
      permsConfig,
      alwaysEnabledPerms: ['map'],
    },
  )
  expect(perms!.map).toBe(true)
  expect(perms!.pokemon).toBe(false)
})

test('a non-member of any allowedGuilds guild gets nothing', () => {
  const perms = computeDiscordPerms(
    { id: 'u1', guildResults: { 'good-guild': notMember } },
    {
      allowedUsers: [],
      allowedGuilds: ['good-guild'],
      blockedGuilds: [],
      permsConfig,
      alwaysEnabledPerms: ['map'],
    },
  )
  expect(perms!.map).toBe(false)
  expect(perms!.blocked).toBeUndefined()
})

test('an alwaysEnabledPerms perm that is disabled in config is never granted', () => {
  const perms = computeDiscordPerms(
    { id: 'u1', guildResults: { 'good-guild': member([]) } },
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
  expect(perms!.admin).toBe(false)
})

test('a missing/unknown result for a relevant guild is skipped rather than treated as no perms', () => {
  const perms = computeDiscordPerms(
    { id: 'u1', guildResults: {} },
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

test('an explicit unknown status for a relevant guild is skipped', () => {
  const perms = computeDiscordPerms(
    {
      id: 'u1',
      guildResults: {
        'good-guild': { status: 'unknown', reason: 'rate_limited' },
      },
    },
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

test('a null guildResults map (bot not configured) is skipped rather than treated as no perms', () => {
  const perms = computeDiscordPerms(
    { id: 'u1', guildResults: null },
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

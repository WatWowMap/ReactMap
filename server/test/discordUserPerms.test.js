const assert = require('node:assert/strict')
const { after, mock, test } = require('node:test')

const config = require('@rm/config')
const { Client } = require('discord.js')

require('./stateMock')

mock.method(Client.prototype, 'login', async () => '')

const GUILD = '100'
const ROLE = '101'
const FRIEND = '555'

const overrides = {
  'authentication.perms': {
    map: { enabled: true, roles: [ROLE] },
    iv: { enabled: true, roles: [FRIEND] },
  },
  'authentication.alwaysEnabledPerms': [],
  'authentication.areaRestrictions': [{ roles: [FRIEND], areas: ['north'] }],
  areas: { names: new Set(['north']), withoutParents: {} },
  webhooks: [],
  scanner: {},
}
const { getSafe } = config
mock.method(config, 'getSafe', (key) =>
  key in overrides ? overrides[key] : getSafe(key),
)

const { DiscordClient } = require('../src/services/DiscordClient')

const discord = new DiscordClient('discord', {
  name: 'discord',
  type: 'discord',
  enabled: false,
  allowedGuilds: [GUILD],
  allowedUsers: [],
  blockedGuilds: [],
  trialPeriod: { roles: [] },
})
mock.method(discord, 'getUserRoles', async () => [ROLE])

after(() => discord.client.destroy())

const profile = (id) => ({ id, username: id, guilds: [{ id: GUILD }] })

test('a user id in a perm grants it like a role', async () => {
  const perms = await discord.getPerms(profile(FRIEND))
  assert.equal(perms.iv, true)
  assert.equal(perms.map, true)
})

test('a user id in an area restriction grants its areas', async () => {
  const perms = await discord.getPerms(profile(FRIEND))
  assert.deepEqual(perms.areaRestrictions, ['north'])
})

test('other users still need the role', async () => {
  const perms = await discord.getPerms(profile('556'))
  assert.equal(perms.iv, false)
  assert.equal(perms.map, true)
})

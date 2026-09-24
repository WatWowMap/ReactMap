const assert = require('node:assert/strict')
const { after, before, beforeEach, mock, test } = require('node:test')

const config = require('@rm/config')
const { Client, Status } = require('discord.js')
const knexFactory = require('knex')

const { state } = require('./stateMock')

// discord.js handles the gateway packets below for real, the client just never connects
mock.method(Client.prototype, 'login', async () => '')

const GUILD = '100'
const OTHER_GUILD = '200'
const ROLES = {
  map: '101',
  donor: '102',
  trial: '103',
  area: '104',
  alerts: '105',
  scout: '106',
  noCooldown: '107',
  cosmetic: '108',
  other: '109',
}

const overrides = {
  'authentication.perms': {
    map: { enabled: true, roles: [ROLES.map] },
    pokemon: { enabled: true, roles: [ROLES.map, ROLES.donor] },
  },
  'authentication.alwaysEnabledPerms': [],
  'authentication.areaRestrictions': [{ roles: [ROLES.area], areas: [] }],
  webhooks: [{ name: 'hook', enabled: true, discordRoles: [ROLES.alerts] }],
  scanner: {
    backendConfig: {},
    scanNext: {
      enabled: true,
      discordRoles: [ROLES.scout],
      cooldownBypass: { discordRoles: [ROLES.noCooldown] },
    },
  },
}
const { getSafe } = config
mock.method(config, 'getSafe', (key) =>
  key in overrides ? overrides[key] : getSafe(key),
)

const { DiscordClient } = require('../src/services/DiscordClient')
const { Session } = require('../src/models/Session')

const discord = new DiscordClient('discord', {
  name: 'discord',
  type: 'discord',
  enabled: false,
  allowedGuilds: [GUILD],
  trialPeriod: { roles: [ROLES.trial] },
})
const cleared = mock.method(discord, 'clearUser')
const shard = { id: 0, status: Status.Ready, checkReady: () => {} }

/** Hands a gateway packet to discord.js and waits for any revocation it started */
async function dispatch(t, d) {
  const started = cleared.mock.callCount()
  discord.client.ws.handlePacket({ t, d }, shard)
  await Promise.all(
    cleared.mock.calls.slice(started).map(({ result }) => result),
  )
}

const user = (id) => ({ id, username: `user ${id}`, discriminator: '0' })
/** Discord leaves @everyone out of a member's roles, discord.js adds it back */
const member = (id, roles, guildId = GUILD) => ({
  guild_id: guildId,
  user: user(id),
  roles,
  joined_at: '2024-01-01T00:00:00.000Z',
})
/** Caches members the way fetching them does */
const cache = (...members) =>
  dispatch('GUILD_MEMBERS_CHUNK', {
    guild_id: GUILD,
    members,
    chunk_index: 0,
    chunk_count: 1,
  })

const revocations = []
const revoked = (id) => [
  ['perms', id, 'discord', 'bot'],
  ['sessions', id, 'bot'],
]

before(async () => {
  // a connected bot, the gateway does not send the member lists of large guilds
  discord.client.ws.status = Status.Ready
  await dispatch('READY', {
    user: { id: '1', username: 'bot', discriminator: '0', bot: true },
    guilds: [],
    application: { id: '1' },
  })
  await dispatch('GUILD_CREATE', {
    id: GUILD,
    name: 'map',
    roles: [GUILD, ...Object.values(ROLES)].map((id) => ({
      id,
      name: id,
      permissions: '0',
    })),
    members: [],
  })
  await dispatch('GUILD_CREATE', {
    id: OTHER_GUILD,
    name: 'other',
    roles: [{ id: OTHER_GUILD, name: 'everyone', permissions: '0' }],
    members: [],
  })
})

after(() => discord.client.destroy())

beforeEach(() => {
  revocations.length = 0
  state.db.models.User = {
    clearPerms: async (...args) => revocations.push(['perms', ...args]),
  }
  state.db.models.Session = {
    clearDiscordSessions: async (...args) =>
      revocations.push(['sessions', ...args]),
  }
})

test('an update for a member discord.js has not cached revokes, the roles it removed are unknown', async () => {
  await dispatch('GUILD_MEMBER_UPDATE', member('1001', [ROLES.cosmetic]))
  assert.deepEqual(revocations, revoked('1001'))
})

test('an uncached member leaving revokes', async () => {
  await dispatch('GUILD_MEMBER_REMOVE', { guild_id: GUILD, user: user('1002') })
  assert.deepEqual(revocations, revoked('1002'))
})

test('uncached members of a guild that grants no permissions are left alone', async () => {
  await dispatch('GUILD_MEMBER_UPDATE', member('1003', [], OTHER_GUILD))
  assert.deepEqual(revocations, [])
})

test('removing a permission role revokes even when another role changed first', async () => {
  await cache(member('1004', [ROLES.cosmetic, ROLES.map]))
  await dispatch('GUILD_MEMBER_UPDATE', member('1004', []))
  assert.deepEqual(revocations, revoked('1004'))
})

test('removing a role that only grants Scout revokes', async () => {
  await cache(member('1005', [ROLES.map, ROLES.scout]))
  await dispatch('GUILD_MEMBER_UPDATE', member('1005', [ROLES.map]))
  assert.deepEqual(revocations, revoked('1005'))
})

test('every role that getPerms reads is watched', async () => {
  const watched = [
    ROLES.donor,
    ROLES.trial,
    ROLES.area,
    ROLES.alerts,
    ROLES.noCooldown,
  ]
  await cache(...watched.map((role) => member(`3${role}`, [ROLES.map, role])))
  await watched.reduce(async (previous, role) => {
    await previous
    revocations.length = 0
    await dispatch('GUILD_MEMBER_UPDATE', member(`3${role}`, [ROLES.map]))
    assert.deepEqual(revocations, revoked(`3${role}`), role)
  }, Promise.resolve())
})

test('changing only unrelated roles of a cached member keeps the sessions', async () => {
  await cache(member('1006', [ROLES.map, ROLES.cosmetic]))
  await dispatch(
    'GUILD_MEMBER_UPDATE',
    member('1006', [ROLES.map, ROLES.other]),
  )
  assert.deepEqual(revocations, [])
})

test('a failed revocation step is reported and does not skip the other', async (t) => {
  const knex = knexFactory({
    client: 'mysql2',
    connection: { socketPath: '/nonexistent/reactmap-test.sock' },
  })
  t.after(() => knex.destroy())
  Session.knex(knex)
  state.db.models.User = {
    clearPerms: async () => {
      throw new Error('user table unavailable')
    },
  }
  state.db.models.Session = Session
  const errors = t.mock.method(discord.log, 'error', () => {})

  await dispatch('GUILD_MEMBER_REMOVE', { guild_id: GUILD, user: user('1007') })
  assert.deepEqual(
    errors.mock.calls.map(({ arguments: [message, e] }) => [
      message,
      e.code || e.message,
    ]),
    [
      ['Could not clear perms for user 1007', 'user table unavailable'],
      ['Could not clear sessions for user 1007', 'ENOENT'],
    ],
  )
})

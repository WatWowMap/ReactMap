const assert = require('node:assert/strict')
const { test } = require('node:test')

const { planLink, sessionUser } = require('../src/services/linkAccount')

const discord = (id, extra = {}) => ({
  id,
  strategy: 'discord',
  discordId: `d${id}`,
  ...extra,
})
const telegram = (id, extra = {}) => ({
  id,
  strategy: 'telegram',
  telegramId: `t${id}`,
  ...extra,
})

test('without a logged in row it is a plain login', () => {
  assert.deepEqual(planLink(null, null, 'telegram'), { action: 'login' })
})

test('a row that already has that platform logs in instead of linking', () => {
  assert.deepEqual(planLink(telegram(1), null, 'telegram'), {
    action: 'login',
  })
  // a different account of the same platform switches accounts
  assert.deepEqual(planLink(telegram(1), telegram(2), 'telegram'), {
    action: 'login',
  })
})

test('a discord user links telegram that has no row yet', () => {
  assert.deepEqual(planLink(discord(1), null, 'telegram'), {
    action: 'link',
    merge: null,
  })
})

test('a discord user links telegram and absorbs its telegram-only row', () => {
  const other = telegram(2)
  assert.deepEqual(planLink(discord(1), other, 'telegram'), {
    action: 'link',
    merge: other,
  })
})

test('a telegram user links discord and absorbs its discord-only row', () => {
  const other = discord(2)
  assert.deepEqual(planLink(telegram(1), other, 'discord'), {
    action: 'link',
    merge: other,
  })
})

test('a local user links like before', () => {
  const local = { id: 1, strategy: 'local', username: 'me' }
  const other = discord(2)
  assert.deepEqual(planLink(local, other, 'discord'), {
    action: 'link',
    merge: other,
  })
})

test('a local account is never merged away', () => {
  const other = {
    id: 2,
    strategy: 'local',
    username: 'x',
    password: 'hash',
    discordId: 'd2',
  }
  assert.deepEqual(planLink(telegram(1), other, 'discord'), {
    action: 'refuse',
  })
})

test('an account linked to a different account of the other platform is refused', () => {
  const other = discord(2, { telegramId: 't7' })
  assert.deepEqual(planLink(telegram(1), other, 'discord'), {
    action: 'refuse',
  })
})

test('the other row brings its link along when the current row has none', () => {
  const local = { id: 1, strategy: 'local', username: 'me' }
  const other = discord(2, { telegramId: 't7' })
  assert.deepEqual(planLink(local, other, 'discord'), {
    action: 'link',
    merge: other,
  })
})

test('a local account that last signed in with discord is still never merged away', () => {
  const other = discord(2, { username: 'x', password: 'hash' })
  assert.deepEqual(planLink(telegram(1), other, 'discord'), {
    action: 'refuse',
  })
})

test('a flipped row without the id its strategy claims does not count as linked', () => {
  // a telegram row whose strategy the old discord link path set to discord
  const flipped = { id: 1, strategy: 'discord', telegramId: 't1' }
  assert.deepEqual(planLink(flipped, discord(2), 'discord'), {
    action: 'link',
    merge: discord(2),
  })
})

test('the session keeps the logged in row and gains the linked id', () => {
  const reqUser = {
    id: 1,
    strategy: 'discord',
    discordId: 'd1',
    username: 'disc',
    perms: { map: true, pokemon: true, webhooks: ['a'] },
  }
  const platformUser = {
    id: 't9',
    username: 'tele',
    provider: 'telegram',
    perms: { map: true, raids: true, webhooks: ['b'] },
  }
  const user = sessionUser(reqUser, platformUser, {
    discordId: 'd1',
    telegramId: 't9',
    webhookStrategy: 'discord',
  })
  assert.equal(user.id, 1)
  assert.equal(user.strategy, 'discord')
  assert.equal(user.username, 'disc')
  assert.equal(user.discordId, 'd1')
  assert.equal(user.telegramId, 't9')
  assert.equal(user.webhookStrategy, 'discord')
  assert.equal(user.perms.pokemon, true)
  assert.equal(user.perms.raids, true)
  assert.deepEqual([...user.perms.webhooks].sort(), ['a', 'b'])
})

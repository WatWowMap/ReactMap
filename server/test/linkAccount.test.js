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
  assert.deepEqual(planLink(null, null, 'telegram'), {
    action: 'login',
    account: null,
  })
})

test('a row that already has that platform logs in instead of linking', () => {
  const current = telegram(1)
  assert.deepEqual(planLink(current, current, 'telegram'), {
    action: 'login',
    account: current,
  })
  // a different account of the same platform switches accounts
  const other = telegram(2)
  assert.deepEqual(planLink(current, other, 'telegram'), {
    action: 'login',
    account: other,
  })
  // ...including one that has no row yet
  assert.deepEqual(planLink(current, null, 'telegram'), {
    action: 'login',
    account: null,
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

test('a row with both ids is never merged away, even into a row without either', () => {
  const local = { id: 1, strategy: 'local', username: 'me' }
  const other = discord(2, { telegramId: 't7' })
  assert.deepEqual(planLink(local, other, 'discord'), { action: 'refuse' })
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

test('the linked session lists both strategies for trial cleanup', () => {
  const user = sessionUser(
    { id: 1, rmStrategy: 'discord', perms: { donor: false, webhooks: [] } },
    { rmStrategy: 'telegram', perms: { trial: true, webhooks: [] } },
    {},
  )
  assert.equal(user.rmStrategy, 'discord')
  assert.deepEqual(user.linkedStrategies, ['discord', 'telegram'])
  assert.equal(user.perms.trial, true)
})

test('a null selected webhook does not hide the linked one', () => {
  const user = sessionUser(
    { id: 1, selectedWebhook: null, perms: { webhooks: [] } },
    { perms: { webhooks: ['poracle'] } },
    { selectedWebhook: 'poracle' },
  )
  assert.equal(user.selectedWebhook, 'poracle')
})

test('the linked session records which strategy granted the trial', () => {
  const user = sessionUser(
    { id: 1, rmStrategy: 'discord', perms: { donor: true, webhooks: [] } },
    { rmStrategy: 'telegram', perms: { trial: true, webhooks: [] } },
    {},
  )
  assert.equal(user.perms.donor, true)
  assert.deepEqual(user.trialStrategies, ['telegram'])
})

test('a trial of the signed in platform carries into the linked session', () => {
  const user = sessionUser(
    { id: 1, rmStrategy: 'discord', perms: { trial: true, webhooks: [] } },
    { rmStrategy: 'telegram', perms: { donor: true, webhooks: [] } },
    {},
  )
  assert.deepEqual(user.trialStrategies, ['discord'])
})

test('relinking keeps the recorded trial strategies', () => {
  const user = sessionUser(
    {
      id: 1,
      rmStrategy: 'discord',
      perms: { trial: true, webhooks: [] },
      trialStrategies: ['telegram'],
    },
    { rmStrategy: 'telegram', perms: { trial: false, webhooks: [] } },
    {},
  )
  assert.deepEqual(user.trialStrategies, ['telegram'])
})

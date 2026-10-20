const assert = require('node:assert/strict')
const { mock, test } = require('node:test')

const config = require('@rm/config')

require('./stateMock')

const extraUserFields = [
  'discordName',
  { name: 'Trainer Name', database: 'trainerName', disabled: false },
  { name: 'Team', database: 'team', disabled: true },
]
const { getSafe } = config
mock.method(config, 'getSafe', (key) =>
  key === 'database.settings.extraUserFields' ? extraUserFields : getSafe(key),
)

const { resolvers } = require('../src/graphql/resolvers')

/** A user row whose writes are recorded */
const setup = () => {
  const writes = []
  const user = {
    data: JSON.stringify({ status: 'local', trainerName: 'Ash' }),
    $query: () => ({
      update: async (patch) => {
        writes.push(JSON.parse(patch.data))
      },
    }),
  }
  const ctx = {
    req: { user: { id: 1 } },
    Db: { query: async () => user },
  }
  return { writes, ctx }
}

test('a configured extra field is saved', async () => {
  const { writes, ctx } = setup()
  assert.equal(
    await resolvers.Mutation.setExtraFields(
      null,
      { key: 'trainerName', value: 'Misty' },
      ctx,
    ),
    true,
  )
  assert.deepEqual(writes, [{ status: 'local', trainerName: 'Misty' }])
})

test('a field listed by name only is saved too', async () => {
  const { writes, ctx } = setup()
  await resolvers.Mutation.setExtraFields(
    null,
    { key: 'discordName', value: 'ash#1' },
    ctx,
  )
  assert.equal(writes[0].discordName, 'ash#1')
})

test('a disabled field is not saved', async () => {
  const { writes, ctx } = setup()
  assert.equal(
    await resolvers.Mutation.setExtraFields(
      null,
      { key: 'team', value: 'valor' },
      ctx,
    ),
    false,
  )
  assert.deepEqual(writes, [])
})

test('the status a local login takes its perms from is not writable', async () => {
  const { writes, ctx } = setup()
  assert.equal(
    await resolvers.Mutation.setExtraFields(
      null,
      { key: 'status', value: 'admin-role' },
      ctx,
    ),
    false,
  )
  assert.deepEqual(writes, [])
})

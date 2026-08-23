const assert = require('node:assert/strict')
const { afterEach, mock, spyOn, test } = require('bun:test')
const knexFactory = require('knex')

require('./stateMock')

const fortAvailable = require('../src/utils/fortAvailable')

afterEach(() => {
  mock.restore()
})

test('endpoint availability uses Golbat Showcase focus without SQL supplementation', async () => {
  let pokestops = {
    showcase_focus_filter: true,
    quests: [],
    invasions: [{ character: 0, display_type: 9 }],
    lures: [],
    showcases: [
      {
        pokemon_id: null,
        form: null,
        type_id: null,
        showcase_focus: { type: 'buddy', min_level: 3 },
      },
    ],
  }
  spyOn(fortAvailable, 'getCombinedFortAvailable').mockImplementation(
    async () => ({
      pokestops,
    }),
  )

  const pokestopModule = require.resolve('../src/models/Pokestop')
  delete require.cache[pokestopModule]
  const { Pokestop } = require('../src/models/Pokestop')
  const originalQuery = Pokestop.query
  let sqlExecutions = 0

  try {
    Pokestop.query = () => {
      sqlExecutions += 1
      throw new Error('endpoint availability must not query SQL')
    }

    const context = {
      hasAltQuests: false,
      hasMultiInvasions: true,
      multiInvasionMs: false,
      hasRewardAmount: true,
      hasConfirmed: true,
      hasShowcaseData: false,
      hasShowcaseForm: false,
      hasShowcaseType: false,
      hasShowcaseFocus: false,
      mem: 'http://unused-golbat',
      secret: '',
      httpAuth: null,
    }

    const result = await Pokestop.getAvailable(context)
    assert.deepEqual(result.available, ['b9', 'y3'])
    assert.equal(sqlExecutions, 0)

    pokestops = { ...pokestops, showcase_focus_filter: false }
    await assert.rejects(
      Pokestop.getAvailable(context),
      /required showcase_focus_filter capability/,
    )
    assert.equal(sqlExecutions, 0)

    pokestops = { ...pokestops }
    delete pokestops.showcase_focus_filter
    await assert.rejects(
      Pokestop.getAvailable(context),
      /required showcase_focus_filter capability/,
    )
    assert.equal(sqlExecutions, 0)
  } finally {
    Pokestop.query = originalQuery
    delete require.cache[pokestopModule]
  }
})

test('malformed endpoint availability falls through to dual-source SQL', async () => {
  spyOn(fortAvailable, 'getCombinedFortAvailable').mockImplementation(
    async () => ({
      pokestops: {
        showcase_focus_filter: true,
        quests: [],
        invasions: [],
        lures: {},
        showcases: [],
      },
    }),
  )

  const pokestopModule = require.resolve('../src/models/Pokestop')
  delete require.cache[pokestopModule]
  const { Pokestop } = require('../src/models/Pokestop')
  const originalQuery = Pokestop.query
  const knex = knexFactory({ client: 'mysql2' })
  let sqlExecutions = 0

  try {
    Pokestop.query = () => {
      const query = knex('pokestop')
      query.then = (resolve, reject) => {
        sqlExecutions += 1
        const rows = query.toSQL().sql.includes('showcase_focus')
          ? [{ showcase_focus: '{"type":"buddy","min_level":4}' }]
          : []
        return Promise.resolve(rows).then(resolve, reject)
      }
      return query
    }

    const result = await Pokestop.getAvailable({
      hasAltQuests: false,
      hasMultiInvasions: false,
      multiInvasionMs: false,
      hasRewardAmount: true,
      hasConfirmed: false,
      hasShowcaseData: false,
      hasShowcaseForm: false,
      hasShowcaseType: false,
      hasShowcaseFocus: true,
      mem: 'http://malformed-golbat',
      secret: '',
      httpAuth: null,
    })

    assert.equal(sqlExecutions > 0, true)
    assert.equal(result.available.includes('y4'), true)
  } finally {
    Pokestop.query = originalQuery
    delete require.cache[pokestopModule]
    await knex.destroy()
  }
})

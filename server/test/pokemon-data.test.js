// @ts-check
const assert = require('node:assert/strict')
const { afterEach, mock, spyOn, test } = require('bun:test')

const Ohbem = require('ohbem')

const modulePath = require.resolve('../src/services/PokemonData')

afterEach(() => {
  mock.restore()
})

afterEach(() => {
  delete require.cache[modulePath]
})

test('Pokemon data is cached and can be refreshed', async () => {
  const snapshots = [{ version: 1 }, { version: 2 }]
  let fetches = 0
  spyOn(Ohbem, 'fetchPokemonData').mockImplementation(
    async () => snapshots[fetches++],
  )

  const { ensurePokemonData, refreshPokemonData } = require(modulePath)

  assert.equal(await ensurePokemonData(), snapshots[0])
  assert.equal(await ensurePokemonData(), snapshots[0])
  assert.equal(fetches, 1)

  assert.equal(await refreshPokemonData(), snapshots[1])
  assert.equal(await ensurePokemonData(), snapshots[1])
  assert.equal(fetches, 2)
})

test('A failed refresh retains the last good Pokemon data', async () => {
  const snapshot = { version: 1 }
  let fail = false
  spyOn(Ohbem, 'fetchPokemonData').mockImplementation(async () => {
    if (fail) throw new Error('unavailable')
    return snapshot
  })

  const { ensurePokemonData, refreshPokemonData } = require(modulePath)

  assert.equal(await ensurePokemonData(), snapshot)
  fail = true
  await assert.rejects(refreshPokemonData(), /unavailable/)
  assert.equal(await ensurePokemonData(), snapshot)
})

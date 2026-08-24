import { expect, test } from 'bun:test'
import { generateFixtureGyms, generateFixturePokemon } from './fixtures'

test('regenerating pokemon fixtures produces byte-identical entities', () => {
  const first = generateFixturePokemon()
  const second = generateFixturePokemon()

  expect(first).not.toBe(second)
  expect(second).toEqual(first)
})

test('regenerating gym fixtures produces byte-identical entities', () => {
  const first = generateFixtureGyms()
  const second = generateFixtureGyms()

  expect(first).not.toBe(second)
  expect(second).toEqual(first)
})

test('expiry timestamps do not move with wall-clock time', async () => {
  const first = generateFixturePokemon()
  await new Promise((resolve) => setTimeout(resolve, 25))
  const second = generateFixturePokemon()

  const moved = first.filter(
    (entity, index) => entity.expiresAt !== second[index]?.expiresAt,
  )
  expect(moved).toHaveLength(0)
})

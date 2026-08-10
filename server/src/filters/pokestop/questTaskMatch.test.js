const test = require('node:test')
const assert = require('node:assert/strict')

const { addTaskCondition, matchesAdvancedFilter } = require('./questTaskMatch')

// --- matchesAdvancedFilter ---

test('no filter never matches', () => {
  assert.equal(matchesAdvancedFilter(undefined, 'anything'), false)
})

test('enabled filter with no narrowing matches unconditionally', () => {
  assert.equal(matchesAdvancedFilter({}, 'anything'), true)
  assert.equal(matchesAdvancedFilter({ enabled: true }, 'anything'), true)
})

test('.all bypasses narrowing entirely', () => {
  assert.equal(matchesAdvancedFilter({ adv: 'x,y', all: true }, 'z'), true)
})

test('.adv as a comma string narrows to the listed values', () => {
  const filter = { adv: 'a,b,c' }
  assert.equal(matchesAdvancedFilter(filter, 'b'), true)
  assert.equal(matchesAdvancedFilter(filter, 'z'), false)
})

test('.adv as an array narrows the same way as a comma string', () => {
  const filter = { adv: ['a', 'b', 'c'] }
  assert.equal(matchesAdvancedFilter(filter, 'b'), true)
  assert.equal(matchesAdvancedFilter(filter, 'z'), false)
})

test('empty .adv (empty string) matches unconditionally', () => {
  // split(',') on '' yields [''], and the falsy first element is filtered
  // out by the caller before .adv is ever set to '' - but guard it anyway.
  assert.equal(matchesAdvancedFilter({ adv: '' }, 'anything'), true)
})

// --- addTaskCondition ---

test('creates a new task entry on first sight', () => {
  const taskConditions = {}
  const key = addTaskCondition(taskConditions, '7-0', 'catch_pokemon', 10)
  assert.equal(key, 'kcatch_pokemon-10')
  assert.deepEqual(taskConditions, {
    'kcatch_pokemon-10': {
      title: 'catch_pokemon',
      target: 10,
      rewards: { '7-0': true },
    },
  })
})

test('accumulates multiple reward keys onto the same task', () => {
  const taskConditions = {}
  addTaskCondition(taskConditions, '7-0', 'catch_pokemon', 10)
  addTaskCondition(taskConditions, 'q1', 'catch_pokemon', 10)
  addTaskCondition(taskConditions, 'a633-2291', 'catch_pokemon', 10)
  assert.deepEqual(
    Object.keys(taskConditions['kcatch_pokemon-10'].rewards).sort(),
    ['7-0', 'a633-2291', 'q1'].sort(),
  )
})

test('the same reward seen twice for one task only appears once', () => {
  const taskConditions = {}
  addTaskCondition(taskConditions, '7-0', 'catch_pokemon', 10)
  addTaskCondition(taskConditions, '7-0', 'catch_pokemon', 10)
  assert.deepEqual(Object.keys(taskConditions['kcatch_pokemon-10'].rewards), [
    '7-0',
  ])
})

test('distinct (title, target) pairs stay in separate entries', () => {
  const taskConditions = {}
  addTaskCondition(taskConditions, '7-0', 'catch_pokemon', 10)
  addTaskCondition(taskConditions, '7-0', 'catch_pokemon', 5)
  addTaskCondition(taskConditions, '7-0', 'catch_water_pokemon', 10)
  assert.deepEqual(Object.keys(taskConditions).sort(), [
    'kcatch_pokemon-10',
    'kcatch_pokemon-5',
    'kcatch_water_pokemon-10',
  ])
})

test('round trip: a reward key added via addTaskCondition matches via matchesAdvancedFilter', () => {
  const taskConditions = {}
  const taskKey = addTaskCondition(taskConditions, '7-0', 'catch_pokemon', 10)
  // Simulate a user narrowing the task filter to just this one reward.
  const filters = { [taskKey]: { adv: '7-0' } }
  assert.equal(matchesAdvancedFilter(filters[taskKey], '7-0'), true)
  assert.equal(matchesAdvancedFilter(filters[taskKey], 'q1'), false)
})

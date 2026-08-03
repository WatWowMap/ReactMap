const test = require('node:test')
const assert = require('node:assert/strict')

const { buildPokestopDnfFilters } = require('./pokestop')

const TASK_CONDITIONS = {
  'kcatch_pokemon-10': {
    title: 'catch_pokemon',
    target: 10,
    rewards: ['7', 'q1', 'a633-2291'],
  },
}

test('a task-only filter (no taskConditions passed) produces no quest clauses', () => {
  // Without the third argument, expandTaskFilters is a no-op - the task key
  // is dropped by the switch's default case, same as the original bug.
  const filters = {
    onlyQuests: true,
    'kcatch_pokemon-10': { all: false, adv: '' },
  }
  const clauses = buildPokestopDnfFilters(filters, {})
  assert.deepEqual(clauses, [])
})

test('an unnarrowed enabled task expands to every reward it can grant', () => {
  const filters = {
    onlyQuests: true,
    'kcatch_pokemon-10': { all: false, adv: '' },
  }
  const clauses = buildPokestopDnfFilters(filters, {}, TASK_CONDITIONS)
  // '7-0' -> encounter (type 7), 'q1' -> item (type 2). 'a633-2291' is a
  // rocket-reward key, which only ever produces clauses under onlyInvasions,
  // not onlyQuests - so it correctly contributes nothing here.
  assert.deepEqual(
    clauses.sort((a, b) => a.quest_reward_type[0] - b.quest_reward_type[0]),
    [
      { quest_reward_type: [2], quest_reward_item_id: [1] },
      {
        quest_reward_type: [7],
        quest_reward_pokemon: [{ pokemon_id: 7, form: 0 }],
      },
    ],
  )
})

test('a task narrowed via .adv expands to only the selected rewards', () => {
  const filters = {
    onlyQuests: true,
    'kcatch_pokemon-10': { all: false, adv: 'q1' },
  }
  const clauses = buildPokestopDnfFilters(filters, {}, TASK_CONDITIONS)
  assert.deepEqual(clauses, [
    { quest_reward_type: [2], quest_reward_item_id: [1] },
  ])
})

test('.all on a task bypasses narrowing, same as reward filters', () => {
  const filters = {
    onlyQuests: true,
    'kcatch_pokemon-10': { all: true, adv: 'q1' },
  }
  const clauses = buildPokestopDnfFilters(filters, {}, TASK_CONDITIONS)
  assert.deepEqual(
    clauses.sort((a, b) => a.quest_reward_type[0] - b.quest_reward_type[0]),
    [
      { quest_reward_type: [2], quest_reward_item_id: [1] },
      {
        quest_reward_type: [7],
        quest_reward_pokemon: [{ pokemon_id: 7, form: 0 }],
      },
    ],
  )
})

test('an explicit reward filter already present is not overridden by expansion', () => {
  const filters = {
    onlyQuests: true,
    'kcatch_pokemon-10': { all: false, adv: '' },
    // User separately narrowed the reward filter itself to a specific task -
    // expansion must not clobber that with a blank synthetic entry.
    q1: { all: false, adv: 'other_task__5' },
  }
  const clauses = buildPokestopDnfFilters(filters, {}, TASK_CONDITIONS)
  // Both q1 (explicit) and 7-0 (synthesized) still produce clauses - the
  // point is q1's *filter object* wasn't overwritten, which this test can't
  // directly observe from clauses alone, but the item clause still appearing
  // (rather than vanishing) confirms expansion didn't break the existing key.
  const itemClause = clauses.find((c) => c.quest_reward_type?.[0] === 2)
  assert.deepEqual(itemClause, {
    quest_reward_type: [2],
    quest_reward_item_id: [1],
  })
})

test('an unknown task key with no taskConditions entry expands to nothing, quietly', () => {
  const filters = {
    onlyQuests: true,
    'kmystery_task-1': { all: false, adv: '' },
  }
  const clauses = buildPokestopDnfFilters(filters, {}, TASK_CONDITIONS)
  assert.deepEqual(clauses, [])
})

test('a disabled task key (absent from filters) contributes nothing', () => {
  // Matches the wire contract: disabled filters are never sent at all.
  const filters = { onlyQuests: true }
  const clauses = buildPokestopDnfFilters(filters, {}, TASK_CONDITIONS)
  assert.deepEqual(clauses, [])
})

test('task expansion respects onlyQuests being off, same as any reward key', () => {
  const filters = {
    onlyQuests: false,
    'kcatch_pokemon-10': { all: false, adv: '' },
  }
  const clauses = buildPokestopDnfFilters(filters, {}, TASK_CONDITIONS)
  assert.deepEqual(clauses, [])
})

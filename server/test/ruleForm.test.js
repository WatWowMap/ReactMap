const assert = require('node:assert/strict')
const { test, before } = require('node:test')

const { PoracleAPI } = require('../src/services/Poracle')

/** @type {typeof import('../../src/features/webhooks/services/ruleForm.js')} */
let mod
let uis

before(async () => {
  // eslint-disable-next-line import/extensions -- native ESM needs the extension
  mod = await import('../../src/features/webhooks/services/ruleForm.js')
  uis = new PoracleAPI({
    name: 'test',
    host: 'http://x',
    port: 1,
  }).generateUi()
})

test('slider bounds map to null', () => {
  const ui = uis.pokemon
  const form = mod.ruleToForm(
    'pokemon',
    { pokemon_id: 25, min_iv: null, max_iv: 90 },
    ui,
  )
  assert.equal(form.min_iv, -1)
  assert.equal(form.max_iv, 90)
  const rule = mod.formToRule(
    'pokemon',
    { ...form, min_iv: -1, max_iv: 100 },
    ui,
  )
  assert.equal(rule.min_iv, null)
  assert.equal(rule.max_iv, null)
})

test('pvp slider stays concrete', () => {
  const ui = uis.pokemon
  const form = {
    ...mod.ruleToForm('pokemon', { pokemon_id: 25 }, ui),
    pvpEntry: true,
    pvp_ranking_league: 1500,
    pvp_ranking_best: 1,
    pvp_ranking_worst: 100,
  }
  const rule = mod.formToRule('pokemon', form, ui)
  assert.equal(rule.pvp_ranking_worst, 100)
  assert.equal(rule.pvp_ranking_best, 1)
  assert.equal(rule.pvp_ranking_league, 1500)
  assert.equal(rule.min_iv, null)
})

test('pvp off clears pvp fields', () => {
  const ui = uis.pokemon
  const original = { pokemon_id: 25, pvp_ranking_evolution: true }
  const rule = mod.formToRule(
    'pokemon',
    mod.ruleToForm('pokemon', original, ui),
    ui,
    original,
  )
  assert.equal(rule.pvp_ranking_league, 0)
  assert.equal(rule.pvp_ranking_best, null)
  assert.equal(rule.pvp_ranking_evolution, null)
})

test('size at its lowest bound is any size', () => {
  const rule = mod.formToRule(
    'pokemon',
    { ...mod.ruleToForm('pokemon', {}, uis.pokemon), size: 1, max_size: 5 },
    uis.pokemon,
  )
  assert.equal(rule.size, null)
  assert.equal(rule.max_size, null)
})

test('derived form-only fields', () => {
  const form = mod.ruleToForm(
    'pokemon',
    { pokemon_id: 25, form: 3, distance: 500, max_weight: 5, min_weight: null },
    uis.pokemon,
  )
  assert.equal(form.byDistance, true)
  assert.equal(form.allForms, false)
  assert.equal(form.pvpEntry, false)
  assert.equal(form.xs, true)
  assert.equal(form.xl, false)
})

test('formToRule keeps unknown fields', () => {
  const ui = uis.pokemon
  const original = {
    uid: 7,
    description: 'd',
    pokemon_id: 25,
    costume: 4,
    override_areas: ['town'],
    edit: true,
  }
  const rule = mod.formToRule(
    'pokemon',
    mod.ruleToForm('pokemon', original, ui),
    ui,
    original,
  )
  assert.partialDeepStrictEqual(rule, {
    uid: 7,
    pokemon_id: 25,
    costume: 4,
    override_areas: ['town'],
    edit: true,
  })
  assert.equal('description' in rule, false)
})

test('toForm keeps form-only choices and fills missing defaults', () => {
  const ui = uis.pokemon
  const form = mod.toForm(
    'pokemon',
    { pokemon_id: 25, form: 0, allForms: false, pvpEntry: true, enabled: 1 },
    ui,
  )
  assert.equal(form.allForms, false)
  assert.equal(form.pvpEntry, true)
  assert.equal(form.max_iv, 100)
  assert.equal(form.template, ui.defaults.template)
  const fromRule = mod.toForm('pokemon', { pokemon_id: 25, form: 0 }, ui)
  assert.equal(fromRule.allForms, true)
  assert.equal('enabled' in mod.formToRule('pokemon', form, ui), false)
  assert.equal(mod.toForm('raid', undefined, uis.raid).allMoves, true)
})

test('form-only fields never reach the rule', () => {
  Object.keys(uis)
    .filter((k) => k !== 'human')
    .forEach((category) => {
      const ui = uis[category]
      const rule = mod.formToRule(
        category,
        { ...mod.ruleToForm(category, {}, ui), xs: true, xl: true },
        ui,
      )
      mod.FORM_ONLY_FIELDS.forEach((key) => {
        assert.equal(key in rule, false, `${category}.${key}`)
      })
    })
})

test('catch-all rules round trip', () => {
  const p = mod.formToRule(
    'pokemon',
    mod.ruleToForm('pokemon', { pokemon_id: 0 }, uis.pokemon),
    uis.pokemon,
  )
  assert.equal(p.pokemon_id, 0)
  const raidRule = { pokemon_id: null, level: null }
  const r = mod.formToRule(
    'raid',
    mod.ruleToForm('raid', raidRule, uis.raid),
    uis.raid,
  )
  assert.equal(r.pokemon_id, null)
  assert.equal(r.level, null)
})

test('distance, form and move follow their toggles', () => {
  const form = mod.ruleToForm(
    'raid',
    { pokemon_id: 1, form: 5, move: 3 },
    uis.raid,
  )
  assert.equal(form.allMoves, false)
  const kept = mod.formToRule(
    'raid',
    { ...form, byDistance: false, distance: 99 },
    uis.raid,
  )
  assert.equal(kept.distance, 0)
  assert.equal(kept.form, 5)
  assert.equal(kept.move, 3)
  const any = mod.formToRule(
    'raid',
    { ...form, allForms: true, allMoves: true },
    uis.raid,
  )
  assert.equal(any.form, null)
  assert.equal(any.move, null)
})

test('edit is dropped where v2 rejects it', () => {
  ;['quest', 'gym', 'invasion', 'nest'].forEach((category) => {
    const ui = uis[category]
    const rule = mod.formToRule(
      category,
      { ...mod.ruleToForm(category, {}, ui), edit: true },
      ui,
    )
    assert.equal('edit' in rule, false, category)
  })
  const raid = mod.formToRule(
    'raid',
    { ...mod.ruleToForm('raid', {}, uis.raid), edit: true, summary: true },
    uis.raid,
  )
  assert.equal(raid.edit, true)
  assert.equal('summary' in raid, false)
  const quest = mod.formToRule(
    'quest',
    { ...mod.ruleToForm('quest', {}, uis.quest), summary: true },
    uis.quest,
  )
  assert.equal(quest.summary, true)
})

test('rules only carry fields the category owns', () => {
  Object.keys(uis)
    .filter((k) => k !== 'human')
    .forEach((category) => {
      const ui = uis[category]
      const allowed = new Set(
        Object.keys(ui.defaults).filter(
          (k) => !mod.FORM_ONLY_FIELDS.includes(k),
        ),
      )
      Object.keys(
        mod.formToRule(category, mod.ruleToForm(category, ui.defaults, ui), ui),
      ).forEach((key) => {
        assert.ok(allowed.has(key), `${category}.${key}`)
      })
      const original = { uid: 1, description: 'd', costume: 2 }
      Object.keys(
        mod.formToRule(
          category,
          mod.ruleToForm(category, original, ui),
          ui,
          original,
        ),
      ).forEach((key) => {
        assert.ok(allowed.has(key) || key in original, `${category}.${key}`)
      })
    })
})

test('bot-created v2 rules have no null where the form expects a number', () => {
  const rules = {
    pokemon: {
      pokemon_id: 25,
      template: null,
      min_time: null,
      pvp_ranking_league: 1500,
      pvp_ranking_min_cp: null,
      pvp_ranking_cap: null,
    },
    quest: { reward_type: 3, reward: 0, amount: null, template: null },
    nest: { pokemon_id: 25, min_spawn_avg: null, template: null },
  }
  Object.entries(rules).forEach(([category, rule]) => {
    const ui = uis[category]
    const form = mod.ruleToForm(category, rule, ui)
    Object.entries(ui.defaults).forEach(([key, value]) => {
      if (typeof value === 'number') {
        assert.notEqual(form[key], null, `${category}.${key}`)
        assert.notEqual(form[key], undefined, `${category}.${key}`)
      }
    })
    // template null means the server default and stays null
    assert.equal(form.template, null)
  })
  const pokemon = mod.ruleToForm('pokemon', rules.pokemon, uis.pokemon)
  assert.equal(pokemon.pvp_ranking_cap, 0)
  assert.equal(pokemon.pvp_ranking_min_cp, 0)
  assert.equal(pokemon.min_time, 0)
})

test('getId for catch-alls', () => {
  assert.equal(mod.ruleId('pokemon', { pokemon_id: 0 }), '0-0')
  assert.equal(mod.ruleId('pokemon', { pokemon_id: null }), '0-0')
  assert.equal(mod.ruleId('raid', { pokemon_id: null, level: null }), 'r90')
  assert.equal(mod.ruleId('raid', { pokemon_id: 150, form: null }), '150-0')
  assert.equal(mod.ruleId('incident', { display_type: 9 }), 'showcase')
  assert.equal(mod.ruleId('incident', { display_type: 12 }), 'incident-12')
  assert.equal(mod.ruleId('gym', { team: 'any' }), 't4-0')
  assert.equal(mod.ruleId('egg', { level: 5 }), 'e5')
  assert.equal(mod.ruleId('lure', { lure_id: 501 }), 'l501')
  assert.equal(mod.ruleId('quest', { reward_type: 3, amount: null }), 'd0')
  assert.equal(mod.ruleId('quest', { reward_type: 3, amount: 500 }), 'd500')
  assert.equal(mod.ruleId('invasion', { grunt_type: 'everything' }), 'i0')
  assert.equal(mod.ruleId('invasion', { grunt_type: null }), 'i0')
  assert.equal(
    mod.ruleId('quest', { reward_type: 7, reward: 25, form: null }),
    '25-0',
  )
  const invasions = { 4: { type: 'Water', gender: 1 } }
  assert.equal(
    mod.ruleId('invasion', { grunt_type: 'water', gender: 'male' }, invasions),
    'i4',
  )
})

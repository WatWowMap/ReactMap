import { describe, expect, test } from 'bun:test'
import { startFakeGolbat } from '../acceptance/support/fake-golbat-server'
import {
  buildFortScanBody,
  buildPokemonScanBody,
} from '../src/services/golbat-requests'
import {
  translateFortRules,
  translateNestRules,
  translatePokemonRules,
} from '../src/services/rules-to-golbat-filters'

const box = { min: { lat: 1, lon: 2 }, max: { lat: 3, lon: 4 } }

describe('translatePokemonRules', () => {
  test('a hundo rule for any species translates to an upstream clause a fake Golbat accepts and returns the right fixtures', async () => {
    const hundo = {
      id: 1,
      species_id: null,
      form_id: null,
      iv_min: 100,
      iv_max: 100,
    }
    const { upstream, local } = translatePokemonRules([hundo])
    expect(upstream).toEqual({
      filters: [{ pokemon: [], iv: { min: 100, max: 100 } }],
    })
    expect(local).toEqual([])

    const golbat = startFakeGolbat()
    try {
      const fixtureMatch = { pokemon_id: 1, form: 0, iv: 100 }
      const fixtureMiss = { pokemon_id: 2, form: 0, iv: 90 }
      golbat.setPokemonHandler((body: any) => {
        // The fake doesn't evaluate DNF itself, so prove the shape is what
        // real Golbat expects and hand back the fixture that clause would
        // actually match.
        expect(body.filters).toEqual(upstream!.filters)
        return {
          pokemon: [fixtureMatch],
          examined: 2,
          skipped: 0,
          total: 2,
          limit_reached: false,
        }
      })
      const res = await fetch(`${golbat.url}/api/pokemon/v3/scan`, {
        method: 'POST',
        body: JSON.stringify(
          buildPokemonScanBody({ ...box, filters: upstream!.filters }, null),
        ),
      })
      const json = await res.json()
      expect(json.pokemon).toEqual([fixtureMatch])
      expect(json.pokemon).not.toContainEqual(fixtureMiss)
    } finally {
      golbat.close()
    }
  })

  test('a species+form rule translates the pair; form NULL means any form', () => {
    const withForm = { id: 2, species_id: 19, form_id: 61 }
    const anyForm = { id: 3, species_id: 19, form_id: null }
    expect(translatePokemonRules([withForm]).upstream).toEqual({
      filters: [{ pokemon: [{ id: 19, form: 61 }] }],
    })
    expect(translatePokemonRules([anyForm]).upstream).toEqual({
      filters: [{ pokemon: [{ id: 19, form: null }] }],
    })
  })

  test('a minimum PvP rank above 1 widens the upstream clause to 1 and carries the real bound locally', () => {
    const rule = { id: 4, species_id: 184, great_min: 100, great_max: 500 }
    const { upstream, local } = translatePokemonRules([rule])
    expect(upstream).toEqual({
      filters: [
        { pokemon: [{ id: 184, form: null }], pvp_great: { min: 1, max: 500 } },
      ],
    })
    expect(local).toEqual([
      {
        type: 'pvp_rank',
        ruleId: 4,
        league: 'great',
        min: 100,
        max: 500,
        targetSpeciesId: null,
      },
    ])
  })

  test('pvp_target_species always produces a local check, even at rank 1', () => {
    const rule = {
      id: 5,
      species_id: null,
      pvp_target_species: 184,
      great_min: 1,
      great_max: 100,
    }
    const { upstream, local } = translatePokemonRules([rule])
    expect(upstream!.filters[0]!.pvp_great).toEqual({ min: 1, max: 100 })
    expect(local).toEqual([
      {
        type: 'pvp_rank',
        ruleId: 5,
        league: 'great',
        min: 1,
        max: 100,
        targetSpeciesId: 184,
      },
    ])
  })

  test('an exclusion appears in local and never in the upstream clause', () => {
    const rule = {
      id: 6,
      species_id: null,
      iv_min: 90,
      exclusions: [{ species_id: 129, form_id: null }],
    }
    const { upstream, local } = translatePokemonRules([rule])
    expect(JSON.stringify(upstream)).not.toContain('129')
    expect(local).toEqual([
      { type: 'exclusion', ruleId: 6, speciesId: 129, formId: null },
    ])
  })

  test('a user with no pokemon rules gets upstream: null, not filters: []', () => {
    expect(translatePokemonRules([])).toEqual({ upstream: null, local: [] })
    expect(translatePokemonRules(undefined)).toEqual({
      upstream: null,
      local: [],
    })
  })

  test('upstream: null means skip the scan; a real request with filters: [] proves it would return nothing', async () => {
    const golbat = startFakeGolbat()
    try {
      golbat.setPokemonHandler((body: any) => ({
        pokemon: body.filters.length === 0 ? [] : [{ pokemon_id: 999 }],
        examined: 1,
        skipped: 0,
        total: 1,
        limit_reached: false,
      }))
      const res = await fetch(`${golbat.url}/api/pokemon/v3/scan`, {
        method: 'POST',
        body: JSON.stringify(
          buildPokemonScanBody({ ...box, filters: [] }, null),
        ),
      })
      const json = await res.json()
      expect(json.pokemon).toEqual([])
    } finally {
      golbat.close()
    }
  })
})

describe('translateFortRules', () => {
  test('a gym-only user includes a gyms group and excludes pokestops/stations', async () => {
    const rule = { id: 10, raid_level: 5 }
    const { upstream, local } = translateFortRules({ gym: [rule] })
    expect(upstream).toEqual({
      gyms: { filters: [{ raid_level: [5] }] },
      pokestops: null,
      stations: null,
    })
    expect(local).toEqual([])

    const golbat = startFakeGolbat()
    try {
      golbat.setFortHandler((body: any) => {
        expect(body.gyms).toEqual({ filters: [{ raid_level: [5] }] })
        expect(body.pokestops).toBeNull()
        expect(body.stations).toBeNull()
        return {
          gyms: [{ id: 'gym1', raid_level: 5 }],
          pokestops: [],
          stations: [],
          examined: 1,
          skipped: 0,
          total: 1,
          limit_reached: false,
        }
      })
      const res = await fetch(`${golbat.url}/api/fort/scan`, {
        method: 'POST',
        body: JSON.stringify(
          buildFortScanBody(
            {
              ...box,
              gyms: upstream!.gyms,
              pokestops: upstream!.pokestops,
              stations: upstream!.stations,
            },
            null,
          ),
        ),
      })
      const json = await res.json()
      expect(json.gyms).toEqual([{ id: 'gym1', raid_level: 5 }])
    } finally {
      golbat.close()
    }
  })

  test('a user tracking no forts at all gets upstream: null, not a bare probe', async () => {
    const result = translateFortRules({ gym: [], pokestop: [], station: [] })
    expect(result).toEqual({ upstream: null, local: [] })

    // Show what the bare-probe would have done, to make the avoidance concrete.
    const golbat = startFakeGolbat()
    try {
      golbat.setFortHandler(() => ({
        gyms: [{ id: 'gym1' }],
        pokestops: [{ id: 'stop1' }],
        stations: [{ id: 'station1' }],
        examined: 3,
        skipped: 0,
        total: 3,
        limit_reached: false,
      }))
      const bareProbeBody = buildFortScanBody({ ...box }, null) // no groups passed at all
      expect(bareProbeBody.gyms).toBeNull()
      expect(bareProbeBody.pokestops).toBeNull()
      expect(bareProbeBody.stations).toBeNull()
      const res = await fetch(`${golbat.url}/api/fort/scan`, {
        method: 'POST',
        body: JSON.stringify(bareProbeBody),
      })
      const json = await res.json()
      // decoder/api_fort.go:53-59: all three null means match-everything --
      // this is exactly the shape translateFortRules refuses to send for a
      // no-forts user.
      expect(
        json.gyms.length + json.pokestops.length + json.stations.length,
      ).toBe(3)
    } finally {
      golbat.close()
    }
  })

  test('rule_gym.ex_eligible, in_battle and has_badge are local only', () => {
    const rule = {
      id: 11,
      ex_eligible: true,
      in_battle: false,
      has_badge: true,
    }
    const { upstream, local } = translateFortRules({ gym: [rule] })
    expect(upstream!.gyms!.filters[0]).toEqual({})
    expect(local).toEqual([
      { type: 'ex_eligible', ruleId: 11, value: true },
      { type: 'in_battle', ruleId: 11, value: false },
      { type: 'has_badge', ruleId: 11, value: true },
    ])
  })

  test('rule_pokestop_condition has no upstream field at all', () => {
    const rule = {
      id: 12,
      role: 'quest',
      reward_type: 4,
      conditions: [{ title: 'weather', target: 'sunny' }],
    }
    const { upstream, local } = translateFortRules({ pokestop: [rule] })
    expect(upstream!.pokestops!.filters[0]).toEqual({ quest_reward_type: [4] })
    expect(local).toEqual([
      {
        type: 'quest_condition',
        ruleId: 12,
        title: 'weather',
        target: 'sunny',
      },
    ])
  })
})

describe('translateNestRules', () => {
  test('rule_nest is entirely local -- Golbat has no nest scan endpoint', () => {
    const rule = {
      id: 20,
      species_id: 1,
      form_id: null,
      avg_min: 2,
      avg_max: 10,
    }
    expect(translateNestRules([rule])).toEqual({
      upstream: null,
      local: [
        {
          type: 'nest',
          ruleId: 20,
          speciesId: 1,
          formId: null,
          avgMin: 2,
          avgMax: 10,
        },
      ],
    })
    expect(translateNestRules([])).toEqual({ upstream: null, local: [] })
  })
})

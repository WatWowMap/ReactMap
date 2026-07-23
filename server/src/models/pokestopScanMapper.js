// @ts-check

/**
 * Pure mapper for one pokestop from Golbat's `POST /api/pokestop/scan`
 * (envelope `res.pokestops[]`) or `GET /api/pokestop/id/{id}` (bare object).
 *
 * Produces the SAME per-stop shape `Pokestop.mapRDM` emits from joined SQL
 * rows, so `Pokestop.secondaryFilter` (and the `parseRdmRewards` it calls) run
 * downstream completely unchanged — exactly how `Gym.getAll` reuses its own
 * `secondaryFilter`. All filtering, reward expansion, `key` building, midnight/
 * layer gating, incident-blocker and `events[]` assembly stay in secondaryFilter.
 *
 * Golbat's ApiPokestopResult exposes the full pokestop record, including the
 * generated quest columns (`quest_reward_type`, `quest_item_id`,
 * `quest_pokemon_id`, …) — Golbat commit `ce54037` — so this is a straight
 * field copy with no reward decoding. `quest_rewards` is native JSON (commit
 * `1c86576`, `jsonRaw()`) and is passed through unchanged for `parseRdmRewards`
 * to expand the per-type `info` (candy/xl/mega/xp/dust/form) that has no flat
 * column. `quest_item_id`/`quest_pokemon_id` are copied explicitly because
 * `secondaryFilter` builds reward-type filter keys from them and
 * `parseRdmRewards` cannot reconstruct `quest_item_id` from the rewards JSON.
 *
 * Standalone by design (no requires) so it runs under plain `node` for golden
 * checks with no `node_modules` present.
 *
 * @typedef {object} ApiPokestopIncident
 * @property {number} character 0 for non-rocket (showcase/goldstop/kecleon)
 * @property {number} expiration
 * @property {number} display_type 7 goldstop, 8 kecleon, 9 showcase
 * @property {boolean} confirmed
 * @property {number} [slot_1_pokemon_id]
 * @property {number} [slot_1_form]
 * @property {number} [slot_2_pokemon_id]
 * @property {number} [slot_2_form]
 * @property {number} [slot_3_pokemon_id]
 * @property {number} [slot_3_form]
 */

/**
 * Maps a Golbat invasion entry to ReactMap's `invasionProps` shape (the exact
 * key set `Pokestop.mapRDM` puts on each `pokestop.invasions[]` entry).
 * `character` → `grunt_type` and `expiration` → `incident_expire_timestamp`
 * are the only renames; slots pass through by name.
 *
 * @param {ApiPokestopIncident} inc
 */
function mapInvasion(inc) {
  return {
    incident_expire_timestamp: inc.expiration,
    grunt_type: inc.character,
    display_type: inc.display_type,
    confirmed: inc.confirmed,
    slot_1_pokemon_id: inc.slot_1_pokemon_id,
    slot_1_form: inc.slot_1_form,
    slot_2_pokemon_id: inc.slot_2_pokemon_id,
    slot_2_form: inc.slot_2_form,
    slot_3_pokemon_id: inc.slot_3_pokemon_id,
    slot_3_form: inc.slot_3_form,
  }
}

/**
 * Builds one quest-layer object shaped like a `mapRDM` quest, or `null` when
 * the layer has no active quest. Mirrors `mapRDM`'s `if (quest.quest_reward_type)
 * push` — gated on the flat `quest_reward_type` column Golbat now exposes
 * (commit `ce54037`), which is `null` when there is no quest, so no reward
 * decoding or `JSON.parse` happens here. `quest_item_id`/`quest_pokemon_id` are
 * copied straight from the record (RDM's generated columns) so
 * `secondaryFilter`'s reward-type key switch resolves — `parseRdmRewards` cannot
 * reproduce `quest_item_id`. The native `quest_rewards` array is passed through
 * for `parseRdmRewards` to expand the remaining per-type `info` fields.
 *
 * @param {Record<string, any>} api
 * @param {'' | 'alternative_'} prefix
 * @param {boolean} withAr
 * @returns {Record<string, any> | null}
 */
function buildQuestLayer(api, prefix, withAr) {
  const questRewardType = api[`${prefix}quest_reward_type`]
  if (!questRewardType) return null
  return {
    quest_type: api[`${prefix}quest_type`],
    quest_timestamp: api[`${prefix}quest_timestamp`],
    quest_target: api[`${prefix}quest_target`],
    quest_conditions: api[`${prefix}quest_conditions`],
    quest_rewards: api[`${prefix}quest_rewards`],
    quest_reward_type: questRewardType,
    quest_item_id: api[`${prefix}quest_item_id`],
    quest_pokemon_id: api[`${prefix}quest_pokemon_id`],
    quest_title: api[`${prefix}quest_title`],
    with_ar: withAr,
  }
}

/**
 * Maps one Golbat pokestop to the row shape `Pokestop.secondaryFilter` expects
 * (i.e. one `mapRDM` output entry). Returns `null` for disabled/deleted stops,
 * mirroring `mapRDM`'s `if (!result.enabled || result.deleted) continue`.
 *
 * `quest_*` = AR layer (`with_ar:true`), `alternative_quest_*` = non-AR layer
 * (`with_ar:false`); each is pushed only when its reward type is derivable, so
 * `quests` holds 0, 1, or 2 entries. Every returned incident (grunt AND
 * showcase/goldstop/kecleon event rows) is mapped into `invasions`;
 * `secondaryFilter` splits them into `invasions[]`/`events[]`/incident-blocker.
 * Golbat prunes expired incidents server-side (`CollectPokestopIncidents`
 * keeps `expiration > now`), so no expiry filter is applied here.
 *
 * @param {Record<string, any>} api one ApiPokestopResult
 * @returns {Record<string, any> | null}
 */
function mapScanPokestop(api) {
  if (!api.enabled || api.deleted) return null
  const quests = []
  const base = buildQuestLayer(api, '', true)
  if (base) quests.push(base)
  const alt = buildQuestLayer(api, 'alternative_', false)
  if (alt) quests.push(alt)
  return {
    id: api.id,
    lat: api.lat,
    lon: api.lon,
    enabled: api.enabled,
    url: api.url,
    name: api.name,
    last_modified_timestamp: api.last_modified_timestamp,
    updated: api.updated,
    ar_scan_eligible: api.ar_scan_eligible,
    power_up_points: api.power_up_points,
    power_up_level: api.power_up_level,
    power_up_end_timestamp: api.power_up_end_timestamp,
    lure_id: api.lure_id,
    lure_expire_timestamp: api.lure_expire_timestamp,
    showcase_expiry: api.showcase_expiry,
    showcase_pokemon_id: api.showcase_pokemon_id,
    showcase_pokemon_form_id: api.showcase_pokemon_form_id,
    showcase_pokemon_type_id: api.showcase_pokemon_type_id,
    showcase_ranking_standard: api.showcase_ranking_standard,
    showcase_rankings: api.showcase_rankings,
    quests,
    invasions: (api.invasions || []).map(mapInvasion),
  }
}

module.exports = { mapScanPokestop, buildQuestLayer, mapInvasion }

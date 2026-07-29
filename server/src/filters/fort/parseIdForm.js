// @ts-check

/**
 * Parse a "<id>[-<form>]" key into `{ pokemon_id, form? }`, or `null` when the
 * id isn't finite. Form is a wildcard (omitted) unless the key carries a
 * finite, non-"null" form segment. Shared by the pokestop contest (`f`), gym
 * raid-boss, and station battle-pokemon DNF builders — all form-WILDCARD parses.
 *
 * NOTE: the pokestop quest-encounter default case is deliberately NOT this — a
 * bare key there means form:0 (formless reward) and "<id>-0" is dropped. Only
 * the wildcard-form variant is shared here.
 *
 * @param {string} key
 * @param {number} [offset] chars to skip before the id (e.g. 1 past an `f` prefix)
 * @returns {{ pokemon_id: number, form?: number } | null}
 */
function parseIdFormPair(key, offset = 0) {
  const [idPart, formPart] = key.slice(offset).split('-', 2)
  const id = Number(idPart)
  if (!Number.isFinite(id)) return null
  const pair = { pokemon_id: id }
  if (formPart && formPart !== 'null' && Number.isFinite(Number(formPart)))
    pair.form = Number(formPart)
  return pair
}

module.exports = { parseIdFormPair }

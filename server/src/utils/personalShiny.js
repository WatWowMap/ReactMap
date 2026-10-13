// @ts-check

// Golbat rejects a request with more than 50 distinct player IDs or any ID
// longer than 256 bytes, see `docs/personal-shinies.md` in Golbat
const MAX_PLAYER_IDS = 50
const MAX_PLAYER_ID_BYTES = 256

/**
 * Splits the user's comma/whitespace separated player IDs into the unique,
 * non-empty list Golbat accepts for `annotate_for`
 * @param {unknown} raw
 * @returns {string[]}
 */
function parsePlayerIds(raw) {
  if (typeof raw !== 'string') return []
  const ids = new Set()
  const parts = raw.split(/[\s,]+/)
  for (let i = 0; i < parts.length && ids.size < MAX_PLAYER_IDS; i += 1) {
    const id = parts[i].trim()
    if (id && Buffer.byteLength(id, 'utf8') <= MAX_PLAYER_ID_BYTES) {
      ids.add(id)
    }
  }
  return [...ids]
}

/**
 * The v3 scan takes `gender` as an explicit list instead of the v2 min/max
 * range, every other clause field is identical
 * @param {import('@rm/types').DnfFilter} filter
 */
function toV3Filter(filter) {
  const { gender, ...rest } = filter
  if (!gender) return rest
  const genders = []
  for (let g = gender.min; g <= gender.max; g += 1) genders.push(g)
  return { ...rest, gender: genders }
}

/**
 * Narrows a v3 clause to 100% IV, or drops it when its IV range excludes 100
 * @param {import('@rm/types').DnfFilter} filter
 * @returns {import('@rm/types').DnfFilter | null}
 */
function toShundoFilter(filter) {
  if (filter.iv && filter.iv.max < 100) return null
  return { ...filter, iv: { min: 100, max: 100 } }
}

module.exports = { parsePlayerIds, toV3Filter, toShundoFilter }

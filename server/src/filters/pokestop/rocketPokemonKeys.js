// @ts-check

/** Matches `a<pokemonId>` and the legacy `a<pokemonId>-<formId>` shape. */
const ROCKET_KEY = /^a(\d+)(?:-(\d+))?$/

/**
 * True when any enabled filter selects `pokemonId`, whatever form it carries.
 *
 * The form cannot be compared. The scanner's `incident` table commonly records
 * a reward's form as `0`, while the masterfile encounter pool gives it a real
 * form (Deino is `2291`). An exact comparison drops whichever of the two the
 * ticked filter did not come from, even though the SQL stage already selected
 * the stop by Pokemon ID alone. Grunt rewards do not meaningfully vary by
 * form, so matching on the ID makes every source — confirmed, unconfirmed,
 * scanner, masterfile — agree at once.
 * @param {Record<string, any>} filters
 * @param {number | string} pokemonId
 */
const hasRocketPokemonFilter = (filters, pokemonId) => {
  if (!pokemonId) return false
  const prefix = `a${pokemonId}`
  return Object.keys(filters).some(
    (key) => key === prefix || key.startsWith(`${prefix}-`),
  )
}

/**
 * Collapses Rocket reward keys so a species contributes exactly one filter.
 *
 * The available list is fed from the two sources described above, so the same
 * species can arrive as both `a276-0` and `a276-3163`. The menu renders those
 * as two identical-looking entries, and only whichever one matches the grunt
 * in hand actually does anything.
 *
 * The non-zero form wins: that is the masterfile shape, which is what existing
 * saved filters already hold, and it is what the icon renderer expects. Since
 * `hasRocketPokemonFilter` matches on the ID, the surviving key works for
 * confirmed and unconfirmed grunts alike. Non-Rocket keys are left untouched.
 * @param {Set<string>} availableSet mutated in place
 */
const dedupeRocketPokemonKeys = (availableSet) => {
  /** @type {Map<string, { key: string, form: number }>} */
  const bySpecies = new Map()
  /** @type {string[]} */
  const rocketKeys = []

  availableSet.forEach((key) => {
    const match = ROCKET_KEY.exec(key)
    if (!match) return
    rocketKeys.push(key)
    const [, species, rawForm] = match
    const form = Number(rawForm ?? 0)
    const current = bySpecies.get(species)
    if (!current || (current.form === 0 && form !== 0)) {
      bySpecies.set(species, { key, form })
    }
  })

  const keep = new Set([...bySpecies.values()].map((entry) => entry.key))
  rocketKeys.forEach((key) => {
    if (!keep.has(key)) availableSet.delete(key)
  })
}

module.exports = {
  dedupeRocketPokemonKeys,
  hasRocketPokemonFilter,
}

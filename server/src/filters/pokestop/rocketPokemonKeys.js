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

/**
 * Resolves the form to use when building a Rocket reward's available key.
 *
 * A confirmed grunt's scanner-reported form and the masterfile encounter
 * pool's form for the same species routinely disagree (Wobbuffet has shown
 * up as both `602` and `2328` for the same grunt type). Building the key
 * straight from whichever form the current poll happened to report means the
 * SAME species can mint a NEW, different key on a later poll — a menu entry
 * a user already switched off keeps a live twin they never see appear, and
 * `dedupeRocketPokemonKeys` only reconciles keys within a single poll, not
 * across separate ones over time.
 *
 * Always deriving the form from the masterfile encounter pool - regardless of
 * whether this reward came from a confirmed scanner slot or the unconfirmed
 * fallback - makes every poll agree on the same key for a given species, so
 * there is nothing left to reconcile after the fact.
 * @param {{id: number, form: number}[] | undefined} encounters the grunt's
 *   masterfile encounter pool for this slot (e.g. `fullGrunt.encounters.first`)
 * @param {number} pokemonId
 * @param {number} fallbackForm used only if `pokemonId` isn't in `encounters`
 *   (e.g. a masterfile/scanner mismatch on the species itself, not just form)
 */
const getCanonicalRewardForm = (encounters, pokemonId, fallbackForm) => {
  const match = encounters?.find((poke) => poke.id === pokemonId)
  return match ? match.form : (fallbackForm ?? 0)
}

module.exports = {
  dedupeRocketPokemonKeys,
  getCanonicalRewardForm,
  hasRocketPokemonFilter,
}

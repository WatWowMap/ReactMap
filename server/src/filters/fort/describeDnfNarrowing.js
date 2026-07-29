// @ts-check

/**
 * Builds the DNF observability log line. Leads with the meaningful metric —
 * `returned` (forts of THIS type that DNF matched) narrowed to `final` by
 * secondaryFilter — so a large residual drop flags where DNF is leaving
 * narrowing on the table. `examined` is context only: Golbat's spatial scan
 * counts EVERY fort in the viewport (gyms + stations + pokestops) before the
 * per-type filter, so it is NOT a per-type "before DNF" number — don't read
 * `examined - returned` as DNF's work. `clauses` = DNF clauses sent (0 = match-all).
 *
 * @param {string} label e.g. 'GYM'
 * @param {object[]} clauses the DNF clause array sent to Golbat (empty = match-all)
 * @param {number} examined all forts (every type) scanned in the viewport (res.examined)
 * @param {number} returned forts of this type DNF returned (res.<type>.length)
 * @param {number} final forts left after secondaryFilter
 * @returns {string}
 */
function describeDnfNarrowing(label, clauses, examined, returned, final) {
  const residual = returned - final
  // Compact per-clause shape (field[listLen|value]) so a broad clause is
  // visible — e.g. a quest_reward_type[1] with the exact amount dropped, or a
  // quest_reward_pokemon[50] persisted filter, is the usual cause of a big residual.
  const shape = clauses.length
    ? clauses
        .map((c) =>
          Object.entries(c)
            .map(([k, v]) => {
              if (Array.isArray(v)) return `${k}[${v.length}]`
              if (v && typeof v === 'object')
                return `${k}[${v.min ?? '?'}..${v.max ?? '?'}]`
              return `${k}[${v}]`
            })
            .join('+'),
        )
        .join(' OR ')
    : 'match-all'
  return `[${label}] DNF(${clauses.length}): ${returned} matched -> ${final} after secondaryFilter (-${residual} residual) | ${shape} | ${examined} scanned (all types)`
}

module.exports = { describeDnfNarrowing }

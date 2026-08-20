// @ts-check
import { getFormDisplay } from './getFormDisplay'

const WILD_KEY = /^(\d+)-(\d+)$/

/**
 * Finds the Pokemon that would render multiple visually identical entries in a
 * list, since default form labels are hidden: e.g. when the scanner reports
 * both `667-0` (Unset) and `667-3036` (Normal), both collapse to "Litleo".
 *
 * Two of them spawning at once is an anomaly, so this is evaluated against the
 * exact list being rendered - once only one is left, the labels collapse again.
 *
 * @param {string[]} ids the filter keys that are about to be rendered
 * @returns {Set<string>} the Pokemon ids whose form labels must stay visible
 */
export function getAmbiguousForms(ids) {
  /** @type {Map<string, Set<string>>} */
  const labels = new Map()
  /** @type {Set<string>} */
  const ambiguous = new Set()
  // availability lists are not necessarily unique: Nest.getAvailable() maps
  // both a form 0 row and an explicit default form row to the same key, and a
  // key repeated for one form is not two entries to tell apart
  new Set(ids).forEach((id) => {
    const match = WILD_KEY.exec(id)
    if (!match) return
    const [, pokemonId, form] = match
    const label = getFormDisplay(pokemonId, form, undefined, {
      appendFormSuffix: false,
    })
    const seen = labels.get(pokemonId)
    if (!seen) {
      labels.set(pokemonId, new Set([label]))
    } else if (seen.has(label)) {
      ambiguous.add(pokemonId)
    } else {
      seen.add(label)
    }
  })
  return ambiguous
}

/**
 * @param {Set<string> | undefined} ambiguous result of {@link getAmbiguousForms}
 * @param {string} id
 * @returns {boolean}
 */
export function hasAmbiguousForm(ambiguous, id) {
  if (!ambiguous?.size) return false
  const match = WILD_KEY.exec(id)
  return !!match && ambiguous.has(match[1])
}

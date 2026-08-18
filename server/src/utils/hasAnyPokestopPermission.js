// @ts-check

/**
 * Coarse gate for whether a user can access any Pokéstop-backed layer.
 * Fine-grained field and filter authorization stays with the individual
 * permission checks inside the model and UI builders.
 *
 * @param {Partial<import('@rm/types').Permissions> | null | undefined} perms
 */
function hasAnyPokestopPermission(perms) {
  return Boolean(
    perms?.pokestops ||
      perms?.eventStops ||
      perms?.quests ||
      perms?.invasions ||
      perms?.lures,
  )
}

module.exports = { hasAnyPokestopPermission }

/* eslint-disable no-unused-vars */

/**
 * @param {import("knex").Knex} knex
 */
exports.up = async (knex) => {
  // Increment all non-zero badges by 1 (e.g., moving Bronze from value 1 to value 2, making room for a basic badge)
  await knex('gymBadges')
    .where('badge', '>', 0)
    .update({ badge: knex.raw('?? + 1', ['badge']) })
}

/**
 * @param {import("knex").Knex} knex
 */
exports.down = async (knex) => {
  // Decrement all non-zero badges by 1 (e.g., moving Bronze from value 2 to value 1)
  await knex('gymBadges')
    .where('badge', '>', 0)
    .update({ badge: knex.raw('?? - 1', ['badge']) })
}

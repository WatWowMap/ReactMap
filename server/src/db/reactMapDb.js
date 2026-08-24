// server/src/db/reactMapDb.js
// @ts-check

/**
 * Categories that live in the ReactMap database rather than a scanner database.
 * Mirrors the `useFor` values DbManager treats as ReactMap-owned.
 */
const REACTMAP_CATEGORIES = new Set([
  'user',
  'session',
  'backup',
  'gymBadge',
  'nestSubmission',
])

/**
 * @param {{ useFor?: string[] }[]} schemas
 * @returns {any | null}
 */
function resolveReactMapSchema(schemas) {
  for (const schema of schemas) {
    const useFor = schema.useFor || []
    if (useFor.some((category) => REACTMAP_CATEGORIES.has(category))) {
      return schema
    }
  }
  return null
}

module.exports = { resolveReactMapSchema, REACTMAP_CATEGORIES }

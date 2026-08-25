// server/src/db/reactMapDb.ts

/**
 * The single `useFor` category that selects the ReactMap database.
 *
 * Only `user` does. `DbManager.js:118` sets `reactMapDb` on the capitalised
 * category `User` and on nothing else, then `bindConnections` force-binds
 * Badge, Backup, NestSubmission and Session to whichever schema won on `user`,
 * ignoring their own `useFor`. Matching any wider set would pick a schema that
 * DbManager refuses, which is auth writes going to the wrong database.
 */
const REACTMAP_CATEGORIES = new Set(['user'])

function resolveReactMapSchema(
  schemas: ({ useFor?: string[] } & Record<string, any>)[],
): any | null {
  for (const schema of schemas) {
    const useFor = schema.useFor || []
    if (useFor.some((category: string) => REACTMAP_CATEGORIES.has(category))) {
      return schema
    }
  }
  return null
}

export { REACTMAP_CATEGORIES, resolveReactMapSchema }

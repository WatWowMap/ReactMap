// @ts-check

/** @param {string} conditions */
export function parseQuestConditions(conditions) {
  const [type1, type2] = JSON.parse(conditions)
  return [type1, type2].filter((condition) => condition?.info)
}

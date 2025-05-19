// @ts-check

/** @param {string} conditions */
export function parseQuestConditions(conditions) {
  const [type1, type2] = JSON.parse(conditions)
  const conditionsToReturn = []
  if (type1) {
    if (type1.info) {
      conditionsToReturn.push(type1)
    }
  }
  if (type2) {
    if (type2.info) {
      conditionsToReturn.push(type2)
    }
  }
  return conditionsToReturn
}

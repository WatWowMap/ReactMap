// @ts-check
/**
 * @typedef {import('@rm/masterfile').Masterfile['invasions']} Invasions
 * @param {Invasions[keyof Invasions]} grunt
 * @returns {{ first: number, second: number, third: number }}
 */
export const getGruntReward = (grunt) => {
  const base = { first: 0, second: 0, third: 0 }
  if (!grunt || grunt.type.startsWith('NPC')) {
    return base
  }
  if (grunt.secondReward) {
    base.first = 85
    base.second = 15
    return base
  }
  if (grunt.thirdReward) {
    base.third = 100
    return base
  }
  if (grunt.firstReward) {
    base.first = 100
    return base
  }
  return base
}

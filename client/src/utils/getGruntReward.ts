type Invasions = import('@rm/masterfile').Masterfile['invasions']

export const getGruntReward = (
  grunt: Invasions[keyof Invasions],
): { first: number; second: number; third: number } => {
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

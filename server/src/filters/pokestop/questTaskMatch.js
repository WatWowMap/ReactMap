// @ts-check

/**
 * Shared core of the reward-primary and task-primary quest filter checks.
 *
 * A filter is enabled on its own (no `.adv` narrowing) matches unconditionally
 * - that's the normal "I want this reward" / "I want this task" case. If
 * `.adv` is set, the filter has been narrowed to a specific set of values on
 * the OTHER axis (a reward filter narrowed to specific task conditions, or a
 * task filter narrowed to specific reward keys) - only match if `matchValue`
 * is in that set. `.all` bypasses narrowing entirely, matching the "Set All"
 * bulk-enable semantics used elsewhere.
 * @param {{ adv?: string | string[], all?: boolean } | undefined} filter
 * @param {string} matchValue
 */
const matchesAdvancedFilter = (filter, matchValue) => {
  if (!filter || !filter.adv || filter.all) return !!filter
  const selected = Array.isArray(filter.adv)
    ? filter.adv
    : filter.adv.split(',')
  return !selected.length || selected.includes(matchValue)
}

/**
 * Accumulates one reward key onto its task's entry, mutating `taskConditions`
 * in place. Mirrors the reward-primary `conditions[rewardKey][conditionKey]`
 * map in the opposite direction: one entry per distinct (title, target) pair
 * - unlike a reward, which can come from many tasks, a task key IS one task,
 * so `title`/`target` are stored once and `rewards` accumulates every reward
 * key seen for it across however many quest rows share that task.
 * @param {Record<string, {title: string, target: number, rewards: Record<string, boolean>}>} taskConditions
 * @param {string} key reward key, e.g. `7-0`, `q123`, `a633-2291`
 * @param {string} title
 * @param {number} target
 * @returns {string} the task key that was added/updated, e.g. `kcatch_pokemon-10`
 */
const addTaskCondition = (taskConditions, key, title, target) => {
  const taskKey = `k${title}-${target}`
  if (taskKey in taskConditions) {
    taskConditions[taskKey].rewards[key] = true
  } else {
    taskConditions[taskKey] = { title, target, rewards: { [key]: true } }
  }
  return taskKey
}

module.exports = { addTaskCondition, matchesAdvancedFilter }

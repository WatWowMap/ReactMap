// @ts-check

/**
 * @param {import('@rm/types').StationBattle | null | undefined} battle
 * @param {number} ts
 * @returns {boolean}
 */
export function isStationBattleActive(battle, ts) {
  const battleEnd = Number(battle?.battle_end)
  if (!(battleEnd > ts)) return false
  const battleStart = Number(battle?.battle_start)
  return !Number.isFinite(battleStart) || battleStart === 0 || battleStart <= ts
}

/**
 * @param {import('@rm/types').StationBattle | null | undefined} battle
 * @param {number} ts
 * @returns {boolean}
 */
export function isStationBattleUpcoming(battle, ts) {
  const battleEnd = Number(battle?.battle_end)
  const battleStart = Number(battle?.battle_start)
  return battleEnd > ts && Number.isFinite(battleStart) && battleStart > ts
}

/**
 * @param {import('@rm/types').StationBattle | null | undefined} battle
 * @returns {string}
 */
export function getStationBattleKey(battle) {
  return [
    battle?.battle_level ?? '',
    battle?.battle_start ?? '',
    battle?.battle_end ?? '',
    battle?.battle_pokemon_id ?? '',
    battle?.battle_pokemon_form ?? '',
    battle?.battle_pokemon_costume ?? '',
    battle?.battle_pokemon_gender ?? '',
    battle?.battle_pokemon_alignment ?? '',
    battle?.battle_pokemon_bread_mode ?? '',
    battle?.battle_pokemon_move_1 ?? '',
    battle?.battle_pokemon_move_2 ?? '',
  ].join(':')
}

/**
 * @param {import('@rm/types').Station} station
 * @param {number} ts
 * @returns {import('@rm/types').StationBattle | null}
 */
function getFallbackBattle(station, ts) {
  if (!(Number(station?.battle_end) > ts)) return null
  return {
    battle_level: station.battle_level,
    battle_start: station.battle_start,
    battle_end: station.battle_end,
    battle_pokemon_id: station.battle_pokemon_id,
    battle_pokemon_form: station.battle_pokemon_form,
    battle_pokemon_costume: station.battle_pokemon_costume,
    battle_pokemon_gender: station.battle_pokemon_gender,
    battle_pokemon_alignment: station.battle_pokemon_alignment,
    battle_pokemon_bread_mode: station.battle_pokemon_bread_mode,
    battle_pokemon_move_1: station.battle_pokemon_move_1,
    battle_pokemon_move_2: station.battle_pokemon_move_2,
    battle_pokemon_stamina: station.battle_pokemon_stamina,
    battle_pokemon_cp_multiplier: station.battle_pokemon_cp_multiplier,
    battle_pokemon_estimated_cp: station.battle_pokemon_estimated_cp,
  }
}

/**
 * @param {import('@rm/types').StationBattle[]} battles
 * @param {number} ts
 * @returns {import('@rm/types').StationBattle[]}
 */
function sortStationBattles(battles, ts) {
  return [...battles].sort((left, right) => {
    const leftActive = isStationBattleActive(left, ts)
    const rightActive = isStationBattleActive(right, ts)
    if (leftActive !== rightActive) {
      return leftActive ? -1 : 1
    }

    if (!leftActive) {
      const leftStart = Number(left?.battle_start) || Number.MAX_SAFE_INTEGER
      const rightStart = Number(right?.battle_start) || Number.MAX_SAFE_INTEGER
      if (leftStart !== rightStart) {
        return leftStart - rightStart
      }
    }

    const leftEnd = Number(left?.battle_end) || 0
    const rightEnd = Number(right?.battle_end) || 0
    if (leftEnd !== rightEnd) {
      return rightEnd - leftEnd
    }

    return getStationBattleKey(left).localeCompare(getStationBattleKey(right))
  })
}

/**
 * @param {import('@rm/types').Station} station
 * @param {number} ts
 */
export function getStationBattleState(station, ts) {
  const sourceBattles =
    Array.isArray(station?.battles) && station.battles.length
      ? station.battles
      : []
  const fallbackBattle = sourceBattles.length
    ? null
    : getFallbackBattle(station, ts)
  const popupBattles = sortStationBattles(
    [
      ...sourceBattles.filter((battle) => Number(battle?.battle_end) > ts),
      ...(fallbackBattle ? [fallbackBattle] : []),
    ],
    ts,
  )
  const visibleBattle =
    popupBattles.find((battle) => isStationBattleActive(battle, ts)) || null
  const refreshTimestamps = [
    ...new Set(
      popupBattles.flatMap((battle) => {
        const timestamps = []
        const battleStart = Number(battle?.battle_start)
        const battleEnd = Number(battle?.battle_end)
        if (battleStart > ts) {
          timestamps.push(battleStart)
        }
        if (battleEnd > ts) {
          timestamps.push(battleEnd)
        }
        return timestamps
      }),
    ),
  ]
  const tooltipTimers = visibleBattle
    ? [Number(visibleBattle.battle_end)].filter(Boolean)
    : popupBattles
        .map((battle) => Number(battle?.battle_start))
        .filter((battleStart) => battleStart > ts)
        .slice(0, 1)

  return {
    popupBattles,
    visibleBattle,
    hiddenBattles: visibleBattle
      ? popupBattles.filter(
          (battle) =>
            getStationBattleKey(battle) !== getStationBattleKey(visibleBattle),
        )
      : popupBattles,
    refreshTimestamps,
    tooltipTimers,
  }
}

/**
 * @param {import('@rm/types').StationBattle[] | null | undefined} prev
 * @param {import('@rm/types').StationBattle[] | null | undefined} next
 * @returns {boolean}
 */
export function stationBattlesEqual(prev, next) {
  if ((prev?.length || 0) !== (next?.length || 0)) {
    return false
  }
  return (prev || []).every(
    (battle, index) =>
      getStationBattleKey(battle) === getStationBattleKey(next?.[index]),
  )
}

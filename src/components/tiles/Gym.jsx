// @ts-check
import * as React from 'react'
import { Marker, Popup, Circle } from 'react-leaflet'

import useMarkerTimer from '@hooks/useMarkerTimer'
import { basicEqualFn, useStatic, useStore } from '@hooks/useStore'
import useOpacity from '@hooks/useOpacity'

import gymMarker from '../markers/gym'
import PopupContent from '../popups/Gym'
import ToolTipWrapper from './Timer'

const getColor = (team) => {
  switch (team) {
    case 1:
      return '#0030C8'
    case 2:
      return '#D83C22'
    case 3:
      return '#F1F642'
    default:
      return '#A9A9A9'
  }
}

/**
 *
 * @param {import('@rm/types').Gym & { force?: boolean }} props
 * @returns
 */
const GymTile = ({
  force,
  ...gym
  // item,
  // ts,
  // showTimer,
  // filters,
  // Icons,
  // excludeList,
  // userSettings,
  // params,
  // showCircles,
  // setParams,
  // config,
  // zoom,
}) => {
  const markerRef = React.useRef(null)
  const [done, setDone] = React.useState(false)
  const [stateChange, setStateChange] = React.useState(false)
  // const [badge, setBadge] = React.useState(item.badge || 0)

  const [
    hasRaid,
    hasHatched,
    excludeTeam,
    inTimerList,
    interactionRangeZoom,
    gymIconUrl,
    gymIconSize,
    raidIconUrl,
    raidIconSize,
  ] = useStatic((s) => {
    const newTs = Date.now() / 1000
    const { excludeList, timerList, config, Icons } = s
    const { filters, userSettings } = useStore.getState()

    const filledSlots =
      gym.available_slots !== null ? 6 - gym.available_slots : 0
    const gymFilterId =
      gym.team_id === 0
        ? `t${gym.team_id}-0`
        : `g${gym.team_id}-${filledSlots || 0}`
    const raidFilterId = `${gym.raid_pokemon_id}-${gym.raid_pokemon_form}`
    const eggFilterId = `e${gym.raid_level}`

    const hasRaidInternal =
      gym.raid_end_timestamp >= newTs &&
      gym.raid_level > 0 &&
      (gym.raid_battle_timestamp >= newTs
        ? !excludeList.includes(eggFilterId)
        : !excludeList.includes(raidFilterId))
    const hasHatchedInternal =
      gym.raid_end_timestamp >= newTs && gym.raid_battle_timestamp <= newTs

    return [
      hasRaidInternal,
      hasHatchedInternal,
      excludeList.includes(`t${gym.team_id}-0`),
      timerList.includes(gym.id),
      config.map.interactionRangeZoom,
      Icons.getGyms(
        gym.team_id,
        filledSlots,
        gym.in_battle,
        userSettings.gyms.showExBadge && gym.ex_raid_eligible,
        userSettings.gyms.showArBadge && gym.ar_scan_eligible,
      ),
      Icons.getSize('gym', filters.gyms.filter[gymFilterId]),
      hasRaidInternal
        ? gym.raid_pokemon_id
          ? Icons.getPokemon(
              gym.raid_pokemon_id,
              gym.raid_pokemon_form,
              gym.raid_pokemon_evolution,
              gym.raid_pokemon_gender,
              gym.raid_pokemon_costume,
              gym.raid_pokemon_alignment,
            )
          : Icons.getEggs(
              gym.raid_level,
              hasHatchedInternal,
              gym.raid_is_exclusive,
            )
        : '',
      hasRaidInternal
        ? gym.raid_pokemon_id
          ? Icons.getSize('raid', filters.gyms.filter[raidFilterId])
          : Icons.getSize('raid', filters.gyms.filter[eggFilterId])
        : '',
    ]
  }, basicEqualFn)

  const [
    showTimer,
    showInteractionRange,
    show300mCircles,
    customRange,
    showDiamond,
    showExBadge,
    showArBadge,
    showRaidLevel,
  ] = useStore((s) => {
    const { userSettings, filters, zoom } = s
    return [
      (userSettings.gyms.raidTimers || inTimerList) && hasRaid,
      !!userSettings.gyms.interactionRange && zoom >= interactionRangeZoom,
      !!userSettings.gyms['300mRange'] && zoom >= interactionRangeZoom,
      zoom >= interactionRangeZoom ? userSettings.customRange : 0,
      !!gym.badge &&
        filters.gyms.gymBadges &&
        userSettings.gyms.gymBadgeDiamonds,
      userSettings.gyms.showExBadge && gym.ex_raid_eligible,
      userSettings.gyms.showArBadge && gym.ar_scan_eligible,
      userSettings.gyms.raidLevelBadges && !!raidIconUrl,
    ]
  }, basicEqualFn)

  const opacity = useOpacity(gym.raid_end_timestamp, 'gyms', 'raids')

  const timerToDisplay =
    gym.raid_pokemon_id || hasHatched
      ? gym.raid_end_timestamp
      : gym.raid_battle_timestamp

  useMarkerTimer(timerToDisplay, markerRef, () => setStateChange(!stateChange))

  React.useEffect(() => {
    if (force && !done && markerRef.current) {
      markerRef.current.openPopup()
      setDone(true)
    }
  }, [force])

  return (
    !excludeTeam && (
      <Marker
        ref={markerRef}
        position={[gym.lat, gym.lon]}
        icon={gymMarker({
          showDiamond,
          showExBadge,
          showArBadge,
          showRaidLevel,
          opacity,
          gymIconUrl,
          gymIconSize,
          raidIconUrl,
          raidIconSize,
          ...gym,
        })}
      >
        <Popup position={[gym.lat, gym.lon]}>
          <PopupContent
            hasRaid={hasRaid}
            hasHatched={hasHatched}
            raidIconUrl={raidIconUrl}
            {...gym}
          />
        </Popup>
        {showTimer && (
          <ToolTipWrapper timers={[timerToDisplay]} offset={[0, 5]} />
        )}
        {showInteractionRange && (
          <Circle
            center={[gym.lat, gym.lon]}
            radius={80}
            color={getColor(gym.team_id)}
            weight={0.5}
          />
        )}
        {show300mCircles && (
          <Circle
            center={[gym.lat, gym.lon]}
            radius={300}
            color={getColor(gym.team_id)}
            weight={0.5}
          />
        )}
        {!!customRange && (
          <Circle
            center={[gym.lat, gym.lon]}
            radius={customRange}
            color={getColor(gym.team_id)}
            weight={0.5}
          />
        )}
      </Marker>
    )
  )
}

const MemoGym = React.memo(
  GymTile,
  (prev, next) =>
    prev.raid_pokemon_id === next.raid_pokemon_id &&
    prev.raid_level === next.raid_level &&
    prev.in_battle === next.in_battle &&
    prev.badge === next.badge &&
    prev.team_id === next.team_id &&
    prev.available_slots === next.available_slots &&
    prev.updated === next.updated,
)

export default MemoGym

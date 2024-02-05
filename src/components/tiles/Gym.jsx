/* eslint-disable react/destructuring-assignment */
// @ts-check
import * as React from 'react'
import { Marker, Popup, Circle } from 'react-leaflet'
import { t } from 'i18next'

import useMarkerTimer from '@hooks/useMarkerTimer'
import { basicEqualFn, useMemory } from '@hooks/useMemory'
import { useStorage } from '@hooks/useStorage'
import useOpacity from '@hooks/useOpacity'
import useForcePopup from '@hooks/useForcePopup'
import { sendNotification } from '@services/desktopNotification'
import Utility from '@services/Utility'

import gymMarker from '../markers/gym'
import PopupContent from '../popups/Gym'
import ToolTipWrapper from './Timer'

/** @param {number} team */
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
 * @param {import('@rm/types').Gym} gym
 * @returns
 */
const GymTile = (gym) => {
  const [markerRef, setMarkerRef] = React.useState(null)
  const [stateChange, setStateChange] = React.useState(false)

  const [
    hasRaid,
    hasHatched,
    inTimerList,
    interactionRangeZoom,
    gymIconUrl,
    gymIconSize,
    raidIconUrl,
    raidIconSize,
    audio,
  ] = useMemory((s) => {
    const newTs = Date.now() / 1000
    const { timerList, config, Icons, Audio } = s
    const { filters, userSettings } = useStorage.getState()

    const filledSlots =
      gym.available_slots !== null ? 6 - gym.available_slots : 0
    const gymFilterId =
      gym.team_id === 0
        ? `t${gym.team_id}-0`
        : `g${gym.team_id}-${filledSlots || 0}`
    const raidFilterId = `${gym.raid_pokemon_id}-${gym.raid_pokemon_form}`
    const eggFilterId = `e${gym.raid_level}`

    const hasRaidInternal =
      gym.raid_end_timestamp >= newTs && gym.raid_level > 0
    const hasHatchedInternal =
      gym.raid_end_timestamp >= newTs && gym.raid_battle_timestamp <= newTs

    return [
      hasRaidInternal,
      hasHatchedInternal,
      timerList.includes(gym.id),
      config.general.interactionRangeZoom,
      Icons.getGyms(
        gym.team_id,
        filledSlots,
        gym.in_battle,
        userSettings.gyms.showExBadge && gym.ex_raid_eligible,
        userSettings.gyms.showArBadge && gym.ar_scan_eligible,
      ),
      Icons.getSize('gym', filters.gyms.filter[gymFilterId]?.size),
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
          ? Icons.getSize('raid', filters.gyms.filter[raidFilterId]?.size)
          : Icons.getSize('raid', filters.gyms.filter[eggFilterId]?.size)
        : '',
      hasRaidInternal
        ? Audio.getPokemon(
            gym.raid_pokemon_id,
            gym.raid_pokemon_form,
            gym.raid_pokemon_evolution,
            gym.raid_pokemon_gender,
            gym.raid_pokemon_costume,
            gym.raid_pokemon_alignment,
          )
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
  ] = useStorage((s) => {
    const { userSettings, filters, zoom } = s
    return [
      (userSettings.gyms.raidTimers || inTimerList) && hasRaid,
      !!userSettings.gyms.interactionRanges && zoom >= interactionRangeZoom,
      !!userSettings.gyms['300mRange'] && zoom >= interactionRangeZoom,
      zoom >= interactionRangeZoom ? +userSettings.gyms.customRange || 0 : 0,
      !!gym.badge &&
        filters.gyms.gymBadges &&
        userSettings.gyms.gymBadgeDiamonds,
      userSettings.gyms.showExBadge && gym.ex_raid_eligible,
      userSettings.gyms.showArBadge && gym.ar_scan_eligible,
      userSettings.gyms.raidLevelBadges && !!raidIconUrl,
    ]
  }, basicEqualFn)

  const opacity = useOpacity('gyms', 'raid')(gym.raid_end_timestamp)

  const timerToDisplay =
    gym.raid_pokemon_id || hasHatched
      ? gym.raid_end_timestamp
      : gym.raid_battle_timestamp

  useForcePopup(gym.id, markerRef)
  useMarkerTimer(timerToDisplay, markerRef, () => setStateChange(!stateChange))
  if (hasRaid) {
    sendNotification(`${gym.id}-${hasHatched}`, gym.name, 'raids', {
      lat: gym.lat,
      lon: gym.lon,
      expire: timerToDisplay,
      audio,
      body: `${t(`${hasHatched ? `raid` : 'egg'}_${gym.raid_level}`)}\n${
        gym.raid_pokemon_evolution ? t(`evo_${gym.raid_pokemon_evolution}`) : ''
      }${gym.raid_pokemon_id ? t(`poke_${gym.raid_pokemon_id}`) : ''}${
        gym.raid_pokemon_form ? t(`form_${gym.raid_pokemon_form}`) : ''
      }${gym.raid_pokemon_id ? '\n' : ''}${
        Utility.getTimeUntil(new Date(timerToDisplay * 1000), true).str
      }`,
      icon: raidIconUrl,
    })
  }
  return (
    <Marker
      ref={setMarkerRef}
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

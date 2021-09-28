/* eslint-disable camelcase */
import React from 'react'
import { renderToString } from 'react-dom/server'
import L from 'leaflet'

const getBadgeColor = (raidLevel) => {
  switch (raidLevel) {
    default: return '#292929'
    case 1:
    case 2: return '#BF05C6'
    case 3:
    case 4: return '#9E8A09'
    case 5: return '#088DB6'
    case 6: return '#21BD21'
  }
}

export default function GymMarker(gym, hasEgg, hasRaid, filters, Icons, userSettings) {
  const {
    in_battle, team_id, availble_slots, raid_level, ex_raid_eligible,
  } = gym
  const { gym: gymMod, raid: raidMod } = Icons.modifiers

  const filledSlots = availble_slots !== null ? 6 - availble_slots : 0
  let filterId = team_id === 0 ? `t${team_id}-0` : `g${team_id}-${filledSlots || 0}`
  const gymIcon = Icons.getGyms(team_id, filledSlots, in_battle, userSettings.showExBadge && ex_raid_eligible)
  const gymSize = Icons.getSize('gym', filters.filter[filterId])
  let raidIcon
  let raidSize = 0
  const slotModifier = gymMod[filledSlots] || gymMod['0'] || gymSize * 0.5

  if (hasRaid) {
    const {
      raid_pokemon_id,
      raid_pokemon_evolution,
      raid_pokemon_costume,
      raid_pokemon_gender,
      raid_pokemon_form,
      raid_is_exclusive,
    } = gym

    if (raid_pokemon_id) {
      filterId = `${raid_pokemon_id}-${raid_pokemon_form}`
      raidIcon = Icons.getPokemon(
        raid_pokemon_id, raid_pokemon_form, raid_pokemon_evolution, raid_pokemon_gender, raid_pokemon_costume,
      )
      raidSize = Icons.getSize('raid', filters.filter[filterId])
    } else {
      filterId = `e${raid_level}`
      raidIcon = Icons.getEggs(raid_level, hasEgg, raid_is_exclusive)
      raidSize = Icons.getSize('raid', filters.filter[filterId])
    }
  }

  const ReactIcon = (
    <div className="marker-image-holder top-overlay">
      <img
        src={gymIcon}
        style={{
          width: gymSize,
          height: gymSize,
          bottom: -1 + gymMod.offsetY,
          left: `${gymMod.offsetX * 100}%`,
          transform: 'translateX(-50%)',
        }}
      />
      {(userSettings.showExBadge && ex_raid_eligible && !gymIcon.includes('ex')) && (
        <img
          src="/images/misc/ex.png"
          style={{
            width: gymSize / 1.5,
            height: 'auto',
            bottom: -1 + gymMod.offsetY,
            left: `${gymMod.offsetX * 25}%`,
            transform: 'translateX(-50%)',
          }}
        />
      )}
      {raidIcon && (
        <img
          src={raidIcon}
          style={{
            width: raidSize,
            height: raidSize,
            bottom: gymSize * 0.4 + slotModifier * raidMod.offsetY,
            left: `${raidMod.offsetX * 100}%`,
            transform: 'translateX(-50%)',
          }}
        />
      )}
      {raidIcon && userSettings.raidLevelBadges && (
        <div
          className="iv-badge"
          style={{
            backgroundColor: getBadgeColor(raid_level),
            bottom: gymSize * 0.4 * raidMod.offsetY,
            left: `${raidMod.offsetX * 200}%`,
            transform: 'translateX(-50%)',
          }}
        >
          {raid_level === 6
            ? (
              <img
                src="/images/misc/mega.png"
                style={{
                  width: 17.5,
                  height: 'auto',
                  position: 'absolute',
                  bottom: 1.5,
                  transform: 'translateX(-50%)',
                }}
              />
            )
            : raid_level}
        </div>
      )}
    </div>
  )

  return L.divIcon({
    popupAnchor: [7, -((gymSize + raidSize * 2) + slotModifier) / 2],
    className: 'gym-marker',
    html: renderToString(ReactIcon),
  })
}

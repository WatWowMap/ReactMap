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

export default function GymMarker(gym, hasHatched, hasRaid, filters, Icons, userSettings, badge) {
  const {
    in_battle, team_id, available_slots, raid_level, ex_raid_eligible, ar_scan_eligible,
  } = gym
  const { gym: gymMod, raid: raidMod } = Icons.modifiers

  const filledSlots = available_slots !== null ? 6 - available_slots : 0
  let filterId = team_id === 0 ? `t${team_id}-0` : `g${team_id}-${filledSlots || 0}`
  const gymIcon = Icons.getGyms(
    team_id, filledSlots, in_battle,
    userSettings.showExBadge && ex_raid_eligible,
    userSettings.showArBadge && ar_scan_eligible,
  )
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
      raidIcon = Icons.getEggs(raid_level, hasHatched, raid_is_exclusive)
      raidSize = Icons.getSize('raid', filters.filter[filterId])
    }
  }

  const ReactIcon = (
    <div className="marker-image-holder top-overlay">
      {(filters.gymBadges && userSettings.gymBadgeDiamonds && badge) ? (
        <>
          <div
            style={{
              width: 48,
              height: 48,
              backgroundImage: `url(${gym.url ? gym.url.replace('http', 'https') : ''})`,
              backgroundSize: 'cover',
              backgroundRepeat: 'no-repeat',
              clipPath: 'polygon(50% 0%, 80% 50%, 50% 100%, 20% 50%)',
              transform: 'translateX(-25%) translateY(-75%)',
            }}
          />
          <img
            src={Icons.getMisc(`badge_${badge}`)}
            style={{
              width: 48,
              height: 48,
              bottom: -1 + gymMod.offsetY,
              left: `${gymMod.offsetX * 100}%`,
              transform: 'translateX(-50%)',

            }}
          />
        </>
      ) : (
        <>
          <img
            src={gymIcon}
            style={{
              width: gymSize,
              height: gymSize,
              bottom: 2 + gymMod.offsetY,
              left: `${gymMod.offsetX * 50}%`,
              transform: 'translateX(-50%)',
            }}
          />
          {Boolean(userSettings.showExBadge && ex_raid_eligible && !gymIcon.includes('_ex')) && (
            <img
              src={Icons.getMisc('ex')}
              style={{
                width: gymSize / 1.5,
                height: 'auto',
                bottom: 2 + gymMod.offsetY,
                left: `${gymMod.offsetX * -33}%`,
                transform: 'translateX(-50%)',
              }}
            />
          )}
          {Boolean(userSettings.showArBadge && ar_scan_eligible && !gymIcon.includes('_ar')) && (
            <img
              src={Icons.getMisc('ar')}
              style={{
                width: gymSize / 2,
                height: 'auto',
                bottom: 23 + gymMod.offsetY,
                left: `${gymMod.offsetX * -40}%`,
                transform: 'translateX(-50%)',
              }}
            />
          )}
          {Boolean(in_battle && !gymIcon.includes('_b')) && (
            <img
              src={Icons.getMisc('battle')}
              style={{
                width: gymSize,
                height: 'auto',
                bottom: 13 + gymMod.offsetY,
                left: `${gymMod.offsetX * 50}%`,
                transform: 'translateX(-50%)',
              }}
            />
          )}
          {Boolean(filters.gymBadges && badge) && (
            <img
              src={Icons.getMisc((() => { switch (badge) { case 1: return 'third'; case 2: return 'second'; default: return 'first' } })())}
              style={{
                width: gymSize / 2,
                height: 'auto',
                bottom: 18 + gymMod.offsetY,
                left: `${gymMod.offsetX * 55}%`,
                transform: 'translateX(50%)',
              }}
            />
          )}
        </>
      )}
      {raidIcon && (
        <img
          src={raidIcon}
          style={{
            width: raidSize,
            height: raidSize,
            bottom: gymSize * 0.4 + slotModifier * raidMod.offsetY,
            left: `${raidMod.offsetX * 55}%`,
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
                src={Icons.getMisc('mega')}
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
    popupAnchor: [
      7 + gymMod.popupX + raidMod.popupX,
      (-((gymSize + raidSize * 2) + slotModifier) / 2) + gymMod.popupY + raidMod.popupY,
    ],
    className: 'gym-marker',
    html: renderToString(ReactIcon),
  })
}

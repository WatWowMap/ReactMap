/* eslint-disable react/destructuring-assignment */
// @ts-check
import * as React from 'react'
import { Marker, Popup } from 'react-leaflet'
import { divIcon } from 'leaflet'

import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { useManualPopupTracker } from '@hooks/useManualPopupTracker'
import { useForcePopup } from '@hooks/useForcePopup'
import { useMarkerTimer } from '@hooks/useMarkerTimer'
import { useOpacity } from '@hooks/useOpacity'
import { TooltipWrapper } from '@components/ToolTipWrapper'

import { TappablePopup } from './TappablePopup'

/**
 * @param {import('@rm/types').Tappable} tappable
 */
const BaseTappableTile = (tappable) => {
  const Icons = useMemory((s) => s.Icons)
  const itemFilters = useStorage((s) => s.filters?.tappables?.filter || {})
  const showTimer = useStorage(
    (s) => !!s.userSettings.tappables?.tappableTimers,
  )

  const [markerRef, setMarkerRef] = React.useState(null)
  useForcePopup(tappable.id, markerRef)
  useMarkerTimer(tappable.expire_timestamp || 0, markerRef)
  const handlePopupOpen = useManualPopupTracker('tappables', tappable.id)

  const getOpacity = useOpacity('tappables')
  const opacity = React.useMemo(
    () =>
      tappable.expire_timestamp ? getOpacity(tappable.expire_timestamp) : 1,
    [getOpacity, tappable.expire_timestamp],
  )

  const { icon, rewardIcon, size } = React.useMemo(() => {
    if (!Icons || !tappable.item_id) {
      return { icon: null, rewardIcon: '', size: 24 }
    }
    const filterKey = `q${tappable.item_id}`
    const tappableSize = Icons.getSize('tappable', itemFilters[filterKey]?.size)
    const tappableIcon = Icons.getTappable(tappable.type)
    const tappableReward = Icons.getRewards(
      2,
      tappable.item_id,
      tappable.count || 1,
    )
    if (!tappableIcon) {
      return { icon: null, rewardIcon: '', size: tappableSize }
    }
    const [tappableMod, rewardMod] = Icons.getModifiers('tappable', 'reward')
    const popupAnchor = [
      tappableMod?.popupX || 0,
      tappableSize * -0.7 * (tappableMod?.offsetY || 1) +
        (tappableMod?.popupY || 0),
    ]

    const html = `
      <div
        class="tappable-marker"
        style="--tappable-size:${tappableSize}px;opacity:${opacity};"
      >
        ${
          tappableReward
            ? `
              <div
                class="tappable-marker__bubble"
                style="bottom: calc(100% + 6px + ${rewardMod?.popupY || 0}px);"
              >
                <img src="${tappableReward}" alt="${tappable.item_id}" />
                ${
                  tappable.count && tappable.count > 1
                    ? `<span>x${tappable.count}</span>`
                    : ''
                }
              </div>`
            : ''
        }
        <img
          class="tappable-marker__icon"
          src="${tappableIcon}"
          alt="${tappable.type || ''}"
        />
      </div>
    `

    return {
      size: tappableSize,
      rewardIcon: tappableReward,
      icon: divIcon({
        className: 'tappable-marker-icon',
        iconAnchor: [tappableSize / 2, tappableSize / 2],
        popupAnchor,
        html,
      }),
    }
  }, [
    Icons,
    itemFilters,
    tappable.type,
    tappable.item_id,
    tappable.count,
    opacity,
  ])

  if (!Icons || !icon) {
    return null
  }

  const timers = React.useMemo(
    () => (tappable.expire_timestamp ? [tappable.expire_timestamp] : []),
    [tappable.expire_timestamp],
  )

  return (
    <Marker
      ref={setMarkerRef}
      position={[tappable.lat, tappable.lon]}
      icon={icon}
      eventHandlers={{ popupopen: handlePopupOpen }}
    >
      <Popup position={[tappable.lat, tappable.lon]}>
        <TappablePopup
          tappable={tappable}
          rewardIcon={rewardIcon}
          iconSize={size}
        />
      </Popup>
      {showTimer && !!timers.length && (
        <TooltipWrapper offset={[0, 4]} timers={timers} />
      )}
    </Marker>
  )
}

export const TappableTile = React.memo(
  BaseTappableTile,
  (prev, next) => prev.id === next.id && prev.updated === next.updated,
)

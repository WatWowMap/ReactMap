/* eslint-disable react/destructuring-assignment */
// @ts-check
import * as React from 'react'
import { Marker, Popup, Circle } from 'react-leaflet'
import { divIcon } from 'leaflet'
import { useTheme, alpha } from '@mui/material/styles'

import { useMemory, basicEqualFn } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { useManualPopupTracker } from '@hooks/useManualPopupTracker'
import { useForcePopup } from '@hooks/useForcePopup'
import { useMarkerTimer } from '@hooks/useMarkerTimer'
import { useOpacity } from '@hooks/useOpacity'
import { TooltipWrapper } from '@components/ToolTipWrapper'

import { TappablePopup } from './TappablePopup'
import { getTappableDisplaySettings } from './displayRules'

/**
 * @param {import('@rm/types').Tappable} tappable
 */
const BaseTappableTile = (tappable) => {
  const Icons = useMemory((s) => s.Icons)
  const itemFilters = useStorage((s) => s.filters?.tappables?.filter || {})
  const [timerForced, interactionRangeZoom] = useMemory((s) => {
    const {
      timerList,
      config: { general = {} },
    } = s
    const zoomLimit = Number.isFinite(general.interactionRangeZoom)
      ? general.interactionRangeZoom
      : 15
    return [
      tappable.id == null ? false : timerList.includes(tappable.id),
      zoomLimit,
    ]
  }, basicEqualFn)
  const [showTimerSetting, showInteractionRange, showSpacialRendRange] =
    useStorage((s) => {
      const { userSettings, zoom } = s
      return [
        !!userSettings.tappables?.tappableTimers,
        !!userSettings.tappables?.interactionRanges &&
          zoom >= interactionRangeZoom,
        !!userSettings.tappables?.spacialRendRange &&
          zoom >= interactionRangeZoom,
      ]
    }, basicEqualFn)

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
  const theme = useTheme()
  const bubbleFill = alpha(theme.palette.background.paper, 0.5)
  const bubbleTextColor = theme.palette.text.primary
  const displaySettings = getTappableDisplaySettings(tappable)
  const useRewardPrimary = displaySettings.map.rewardAsPrimary

  const { icon, rewardIcon } = React.useMemo(() => {
    if (!Icons || !tappable.item_id) {
      return { icon: null, rewardIcon: '', size: 24 }
    }
    const filterKey = `q${tappable.item_id}`
    const tappableSize = Icons.getSize('tappable', itemFilters[filterKey]?.size)
    const tappableIcon = Icons.getTappable(tappable.type)
    const [tappableMod, rewardMod] = Icons.getModifiers('tappable', 'reward')
    const popupAnchor = [
      tappableMod?.popupX || 0,
      tappableSize * -0.7 * (tappableMod?.offsetY || 1) -
        tappableSize / 2 +
        (tappableMod?.popupY || 0),
    ]
    const tappableReward = Icons.getRewards(
      2,
      tappable.item_id,
      tappable.count || 1,
    )
    const count = tappable.count || 1
    if (useRewardPrimary && tappableReward) {
      const countBadge =
        count > 1 ? `<span class="tappable-marker__count">x${count}</span>` : ''
      const html = `
        <div
          class="tappable-marker tappable-marker--reward-primary"
          style="--tappable-size:${tappableSize}px;opacity:${opacity};"
        >
          <img
            class="tappable-marker__reward-primary"
            src="${tappableReward}"
            alt="${tappable.type || ''}"
          />
          ${countBadge}
        </div>
      `
      return {
        rewardIcon: tappableReward,
        icon: divIcon({
          className: 'tappable-marker-icon',
          iconAnchor: [tappableSize / 2, tappableSize],
          popupAnchor,
          html,
        }),
      }
    }
    if (!tappableIcon) {
      return { icon: null, rewardIcon: '', size: tappableSize }
    }
    const defaultRewardSize = Icons.getSize('reward')
    const hasCount = count > 1
    const rewardSize = hasCount ? defaultRewardSize : 25
    const textHeight = hasCount ? 14 : 0
    const paddingX = hasCount ? 10 : (30 - rewardSize) / 2
    const paddingTop = hasCount ? 8 : 4
    const paddingBottom = hasCount ? 8 : 4
    const bubbleWidth = hasCount ? rewardSize + paddingX * 2 : 30
    const bubbleHeight = paddingTop + rewardSize + textHeight + paddingBottom
    const tailHeight = hasCount ? 16 : 12
    const tailWidth = Math.min(hasCount ? 24 : 16, bubbleWidth * 0.45)
    const svgHeight = bubbleHeight + tailHeight
    const cornerRadius = hasCount ? 12 : 9
    const bubbleCenterX = bubbleWidth / 2
    const rewardX = paddingX
    const rewardY = paddingTop
    const countY = paddingTop + rewardSize + textHeight / 2
    const bubbleOffset = hasCount ? 6 : 4
    const bubblePath = [
      `M${cornerRadius} 0`,
      `H${bubbleWidth - cornerRadius}`,
      `A${cornerRadius} ${cornerRadius} 0 0 1 ${bubbleWidth} ${cornerRadius}`,
      `V${bubbleHeight - cornerRadius}`,
      `A${cornerRadius} ${cornerRadius} 0 0 1 ${
        bubbleWidth - cornerRadius
      } ${bubbleHeight}`,
      `H${bubbleCenterX + tailWidth / 2}`,
      `L${bubbleCenterX} ${bubbleHeight + tailHeight}`,
      `L${bubbleCenterX - tailWidth / 2} ${bubbleHeight}`,
      `H${cornerRadius}`,
      `A${cornerRadius} ${cornerRadius} 0 0 1 0 ${bubbleHeight - cornerRadius}`,
      `V${cornerRadius}`,
      `A${cornerRadius} ${cornerRadius} 0 0 1 ${cornerRadius} 0`,
      'Z',
    ].join(' ')
    const countText =
      count > 1
        ? `<text x="${bubbleCenterX}" y="${countY}" fill="${bubbleTextColor}" font-size="14" font-family="Roboto, sans-serif" font-weight="600" text-anchor="middle" dominant-baseline="middle">x${count}</text>`
        : ''
    const bubbleSvg = `
      <svg
        viewBox="0 0 ${bubbleWidth} ${svgHeight}"
        width="${bubbleWidth}"
        height="${svgHeight}"
        xmlns="http://www.w3.org/2000/svg"
        class="tappable-marker__bubble-svg"
        aria-hidden="true"
        focusable="false"
      >
        <path d="${bubblePath}" fill="${bubbleFill}" />
        <image
          href="${tappableReward}"
          x="${rewardX}"
          y="${rewardY}"
          width="${rewardSize}"
          height="${rewardSize}"
          preserveAspectRatio="xMidYMid meet"
        />
        ${countText}
      </svg>
    `

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
                style="
                  bottom: calc(100% + ${bubbleOffset}px + ${
                    rewardMod?.popupY || 0
                  }px);
                  width: ${bubbleWidth}px;
                  height: ${svgHeight}px;
                "
              >
                ${bubbleSvg}
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
      rewardIcon: tappableReward,
      icon: divIcon({
        className: 'tappable-marker-icon',
        iconAnchor: [tappableSize / 2, tappableSize],
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
    bubbleFill,
    bubbleTextColor,
    useRewardPrimary,
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
        <TappablePopup tappable={tappable} rewardIcon={rewardIcon} />
      </Popup>
      {(showTimerSetting || timerForced) && !!timers.length && (
        <TooltipWrapper offset={[0, 4]} timers={timers} />
      )}
      {showInteractionRange && (
        <Circle
          center={[tappable.lat, tappable.lon]}
          radius={40}
          pathOptions={{ color: '#0DA8E7', weight: 1 }}
        />
      )}
      {showSpacialRendRange && (
        <Circle
          center={[tappable.lat, tappable.lon]}
          radius={80}
          pathOptions={{
            color: '#4E893E',
            weight: 1,
            dashArray: '5, 5',
          }}
        />
      )}
    </Marker>
  )
}

export const TappableTile = React.memo(
  BaseTappableTile,
  (prev, next) => prev.id === next.id && prev.updated === next.updated,
)

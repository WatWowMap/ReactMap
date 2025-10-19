// @ts-check
import * as React from 'react'
import { useTheme } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'

import { useMemory } from '@store/useMemory'

/**
 * Creates a memoized callback for computing Pokemon background visual metadata.
 * @returns {(backgroundValue: number | string | null | undefined) => {
 *  backgroundId: number
 *  hasBackground: boolean
 *  backgroundUrl: string
 *  primaryColor: string
 *  secondaryColor: string
 *  borderColor: string
 *  primaryTextShadow: string
 *  secondaryTextShadow: string
 *  iconShadow: string
 *  heartBackground: string
 *  heartShadow: string
 *  backgroundMeta?: {
 *    id: number
 *    tooltip: string
 *    typeLabel: string
 *    nameLabel: string
 *  }
 * }} Memoized background visual resolver
 */
export function usePokemonBackgroundVisuals() {
  const { t, i18n } = useTranslation()
  const theme = useTheme()
  const Icons = useMemory((s) => s.Icons)
  const locationCards = useMemory((s) => s.masterfile.locationCards || {})

  return React.useCallback(
    (backgroundValue) => {
      const parsed =
        typeof backgroundValue === 'string'
          ? parseInt(backgroundValue, 10)
          : backgroundValue
      const backgroundId =
        typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : 0
      const backgroundUrl =
        backgroundId && Icons?.getBackground
          ? Icons.getBackground(backgroundId)
          : ''
      const hasBackground =
        Boolean(backgroundId) &&
        typeof backgroundUrl === 'string' &&
        backgroundUrl
      const card = backgroundId ? locationCards?.[backgroundId] : undefined
      const defaultTypeLabel = t('filter_label_location_card')
      const typeKey =
        card?.cardType === 'SPECIAL_BACKGROUND'
          ? 'special_background_filter_header'
          : 'filter_label_location_card'
      const fallbackTypeLabel = card?.cardType
        ? card.cardType.replace(/_/g, ' ')
        : defaultTypeLabel
      const typeLabel = backgroundId
        ? t(typeKey, {
            defaultValue: fallbackTypeLabel || defaultTypeLabel,
          })
        : ''
      let nameLabel = card?.formatted ?? ''
      if (card?.proto) {
        const normalizedProto = card.proto.toLowerCase()
        const candidateKeys = [card.proto, normalizedProto]
        if (typeof i18n.exists === 'function') {
          candidateKeys.some((key) => {
            if (key && i18n.exists(key)) {
              nameLabel = t(key)
              return true
            }
            return false
          })
        }
      }
      if (!nameLabel) {
        nameLabel = card?.proto
          ? card.proto.replace(/^LC_/, '').replace(/_/g, ' ')
          : backgroundId
            ? `#${backgroundId}`
            : ''
      }
      const primaryColor = hasBackground ? '#fff' : theme.palette.text.primary
      const secondaryColor = hasBackground
        ? 'rgba(255, 255, 255, 0.75)'
        : theme.palette.text.secondary
      const borderColor = hasBackground
        ? 'rgba(255, 255, 255, 0.2)'
        : theme.palette.divider
      const secondaryTextShadow = hasBackground
        ? '0 0 3px rgba(0, 0, 0, 0.75)'
        : 'none'
      const primaryTextShadow = secondaryTextShadow
      const iconShadow = hasBackground
        ? 'drop-shadow(0 0 3px rgba(0, 0, 0, 0.75))'
        : 'none'
      const backgroundDescription =
        backgroundId && (typeLabel || fallbackTypeLabel || defaultTypeLabel)
          ? `${typeLabel || fallbackTypeLabel || defaultTypeLabel}: ${nameLabel} (${backgroundId})`
          : ''

      return {
        backgroundId,
        hasBackground,
        backgroundUrl,
        primaryColor,
        secondaryColor,
        borderColor,
        primaryTextShadow,
        secondaryTextShadow,
        iconShadow,
        heartBackground: hasBackground
          ? 'rgba(255, 255, 255, 0.2)'
          : theme.palette.mode === 'dark'
            ? 'white'
            : '#f0f0f0',
        heartShadow: hasBackground
          ? 'drop-shadow(0 0 2px #000)'
          : 'drop-shadow(0 0 1px #0008)',
        backgroundMeta:
          backgroundId && backgroundDescription
            ? {
                id: backgroundId,
                tooltip: backgroundDescription,
                typeLabel: typeLabel || fallbackTypeLabel || defaultTypeLabel,
                nameLabel,
              }
            : undefined,
      }
    },
    [Icons, i18n, locationCards, t, theme],
  )
}

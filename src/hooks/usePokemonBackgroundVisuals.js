// @ts-check
import * as React from 'react'
import { useTheme } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'

import { useMemory } from '@store/useMemory'

/**
 * Creates a memoized callback for computing Pokemon background visual metadata.
 * @returns {(backgroundValue: number | string | null | undefined) => {
 *  hasBackground: boolean
 *  primaryColor: string
 *  borderColor: string
 *  primaryTextShadow: string
 *  styles: {
 *    surface: import('react').CSSProperties
 *    primaryText: import('react').CSSProperties
 *    secondaryText: import('react').CSSProperties
 *    icon: import('react').CSSProperties
 *  }
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
      const hasCard = Boolean(card)
      const fallbackTypeLabel =
        hasCard && card?.cardType
          ? card.cardType.replace(/_/g, ' ')
          : defaultTypeLabel
      const typeKey =
        hasCard && card?.cardType === 'SPECIAL_BACKGROUND'
          ? 'special_background_filter_header'
          : 'filter_label_location_card'
      const unknownBackgroundLabel =
        backgroundId && !hasCard
          ? t('unknown_background_with_id', {
              id: backgroundId,
              defaultValue: `Unknown Background #${backgroundId}`,
            })
          : ''
      let typeLabel = ''
      if (backgroundId && hasCard) {
        typeLabel = t(typeKey, {
          defaultValue: fallbackTypeLabel || defaultTypeLabel,
        })
      }
      let nameLabel = card?.formatted ?? ''
      if (hasCard && card?.proto) {
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
      if (hasCard) {
        if (!nameLabel) {
          nameLabel = card?.proto
            ? card.proto.replace(/^LC_/, '').replace(/_/g, ' ')
            : backgroundId
              ? `#${backgroundId}`
              : ''
        }
      } else if (backgroundId) {
        nameLabel =
          unknownBackgroundLabel || `Unknown Background #${backgroundId}`
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
      let backgroundDescription = ''
      if (backgroundId) {
        if (hasCard) {
          const descriptionLabel =
            typeLabel || fallbackTypeLabel || defaultTypeLabel
          const descriptionName =
            nameLabel || (backgroundId ? `#${backgroundId}` : '')
          backgroundDescription = `${descriptionLabel}: ${descriptionName} (${backgroundId})`
        } else {
          backgroundDescription = nameLabel
        }
      }
      const surfaceBackgroundStyles =
        hasBackground && backgroundUrl
          ? {
              backgroundImage: `url(${backgroundUrl})`,
              backgroundSize: '100% auto',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'top center',
              backgroundColor: '#000',
            }
          : undefined
      const styles = {
        surface: {
          color: primaryColor,
          ...(surfaceBackgroundStyles || {}),
        },
        primaryText: {
          color: primaryColor,
          textShadow: primaryTextShadow,
        },
        secondaryText: {
          color: secondaryColor,
          textShadow: secondaryTextShadow,
        },
        icon: {
          filter: iconShadow,
        },
      }

      return {
        hasBackground,
        primaryColor,
        borderColor,
        primaryTextShadow,
        styles,
        backgroundMeta:
          backgroundId && backgroundDescription
            ? {
                id: backgroundId,
                tooltip: backgroundDescription,
                typeLabel: hasCard
                  ? typeLabel || fallbackTypeLabel || defaultTypeLabel
                  : '',
                nameLabel,
              }
            : undefined,
      }
    },
    [Icons, i18n, locationCards, t, theme],
  )
}

// @ts-check
import * as React from 'react'
import Grid from '@mui/material/Unstable_Grid2'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import { useTranslation } from 'react-i18next'

import { useStorage } from '@store/useStorage'
import { useMemory } from '@store/useMemory'
import { Navigation } from '@components/popups/Navigation'
import { Coords } from '@components/popups/Coords'
import { TimeStamp } from '@components/popups/TimeStamps'

/**
 * @param {{
 *  tappable: import('@rm/types').Tappable,
 *  rewardIcon: string,
 *  iconSize: number,
 * }} props
 */
export function TappablePopup({ tappable, rewardIcon, iconSize }) {
  const { t, i18n } = useTranslation()
  const showCoords = useStorage(
    (s) => !!s.userSettings.tappables?.enableTappablePopupCoords,
  )
  const masterfile = useMemory((s) => s.masterfile)

  const count = tappable.count ?? 1
  const itemName = React.useMemo(() => {
    if (i18n.exists(`item_${tappable.item_id}`)) {
      return t(`item_${tappable.item_id}`)
    }
    return masterfile.items?.[tappable.item_id]?.name || `#${tappable.item_id}`
  }, [t, i18n, masterfile.items, tappable.item_id])

  const formattedType = React.useMemo(() => {
    if (!tappable.type) return ''
    const cleaned = tappable.type
      .replace('TAPPABLE_TYPE_', '')
      .replace(/_/g, ' ')
      .toLowerCase()
    const translationKey = `tappable_type_${cleaned.replace(/\s+/g, '_')}`
    if (i18n.exists(translationKey)) {
      return t(translationKey)
    }
    return cleaned
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }, [tappable.type, t, i18n])

  return (
    <Grid
      container
      spacing={1}
      width={220}
      justifyContent="center"
      alignItems="center"
      textAlign="center"
    >
      {rewardIcon && (
        <Grid xs={12}>
          <img
            src={rewardIcon}
            alt={itemName}
            style={{ width: iconSize, height: iconSize, objectFit: 'contain' }}
          />
        </Grid>
      )}
      <Grid xs={12}>
        <Typography variant="h6">{itemName}</Typography>
        {count > 1 && (
          <Typography variant="subtitle2" color="text.secondary">
            ×{count}
          </Typography>
        )}
        {formattedType && (
          <Typography variant="caption" color="text.secondary">
            {formattedType}
          </Typography>
        )}
      </Grid>
      <Grid xs={12}>
        <Navigation lat={tappable.lat} lon={tappable.lon} size="medium" />
      </Grid>
      {showCoords && (
        <Grid xs={12}>
          <Coords lat={tappable.lat} lon={tappable.lon} />
        </Grid>
      )}
      {(tappable.expire_timestamp || tappable.updated) && (
        <Grid xs={12}>
          <Divider sx={{ my: 0.5 }} />
        </Grid>
      )}
      {tappable.expire_timestamp && (
        <Grid xs={12}>
          <TimeStamp time={tappable.expire_timestamp}>
            {t('disappear_time')}
          </TimeStamp>
        </Grid>
      )}
      {tappable.updated && (
        <Grid xs={12}>
          <TimeStamp time={tappable.updated}>{t('last_updated')}</TimeStamp>
        </Grid>
      )}
    </Grid>
  )
}

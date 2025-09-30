// @ts-check
import * as React from 'react'
import Grid from '@mui/material/Unstable_Grid2'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Tooltip from '@mui/material/Tooltip'
import { useTranslation } from 'react-i18next'

import { useStorage } from '@store/useStorage'
import { useMemory } from '@store/useMemory'
import { Navigation } from '@components/popups/Navigation'
import { Coords } from '@components/popups/Coords'
import { TimeStamp } from '@components/popups/TimeStamps'
import { StatusIcon } from '@components/StatusIcon'

import { getTimeUntil } from '@utils/getTimeUntil'

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

  const hasExpireTime = !!tappable.expire_timestamp

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
      {hasExpireTime && (
        <Grid
          xs={12}
          container
          justifyContent="center"
          alignItems="center"
          spacing={1}
        >
          <TappableTimer
            expireTimestamp={tappable.expire_timestamp}
            verified={!!tappable.expire_timestamp_verified}
            locale={i18n.language}
            t={t}
          />
        </Grid>
      )}
      {tappable.updated && (
        <Grid xs={12}>
          <TimeStamp time={tappable.updated}>{t('last_seen')}</TimeStamp>
        </Grid>
      )}
    </Grid>
  )
}

/**
 * @param {{
 *  expireTimestamp: number,
 *  verified: boolean,
 *  locale: string,
 *  t: import('i18next').TFunction
 * }} props
 */
const TappableTimer = ({ expireTimestamp, verified, locale, t }) => {
  const expireTimeMs = React.useMemo(
    () => expireTimestamp * 1000,
    [expireTimestamp],
  )
  const [timer, setTimer] = React.useState(() =>
    getTimeUntil(expireTimeMs, true),
  )

  React.useEffect(() => {
    setTimer(getTimeUntil(expireTimeMs, true))
    const interval = setInterval(() => {
      setTimer(getTimeUntil(expireTimeMs, true))
    }, 1000)
    return () => clearInterval(interval)
  }, [expireTimeMs])

  return (
    <>
      <Grid xs={6} sm={6}>
        <Typography variant="h6" align="center">
          {timer.str}
        </Typography>
        <Typography variant="subtitle2" align="center">
          {new Date(expireTimeMs).toLocaleTimeString(locale || 'en', {
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
          })}
        </Typography>
      </Grid>
      <Grid xs={2} sm={2} sx={{ display: 'flex', justifyContent: 'center' }}>
        <Tooltip
          title={verified ? t('timer_verified') : t('timer_unverified')}
          arrow
          enterTouchDelay={0}
        >
          <StatusIcon status={verified} />
        </Tooltip>
      </Grid>
    </>
  )
}

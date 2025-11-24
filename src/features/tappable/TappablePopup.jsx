// @ts-check
import * as React from 'react'
import ExpandMore from '@mui/icons-material/ExpandMore'
import MoreVert from '@mui/icons-material/MoreVert'
import Grid from '@mui/material/Unstable_Grid2'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import Collapse from '@mui/material/Collapse'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import { useTranslation } from 'react-i18next'

import { useStorage, setDeepStore } from '@store/useStorage'
import { useMemory } from '@store/useMemory'
import { Navigation } from '@components/popups/Navigation'
import { Coords } from '@components/popups/Coords'
import { TimeStamp } from '@components/popups/TimeStamps'
import { StatusIcon } from '@components/StatusIcon'
import { Title } from '@components/popups/Title'

import { getTimeUntil } from '@utils/getTimeUntil'
import { getTappableDisplaySettings } from './displayRules'

/**
 * @param {{
 *  tappable: import('@rm/types').Tappable,
 *  rewardIcon: string,
 * }} props
 */
export function TappablePopup({ tappable, rewardIcon }) {
  const { t, i18n } = useTranslation()
  const showCoords = useStorage(
    (s) => !!s.userSettings.tappables?.enableTappablePopupCoords,
  )
  const popups = useStorage((s) => s.popups)
  const filterKey = tappable.item_id ? `q${tappable.item_id}` : ''
  const filterEnabled = useStorage((s) =>
    filterKey ? s.filters?.tappables?.filter?.[filterKey]?.enabled : undefined,
  )
  const masterfile = useMemory((s) => s.masterfile)
  const Icons = useMemory((s) => s.Icons)
  const displaySettings = getTappableDisplaySettings(tappable)

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

  const tappableIcon = React.useMemo(() => {
    if (!Icons || typeof Icons.getTappable !== 'function') {
      return ''
    }
    return Icons.getTappable(tappable.type) || ''
  }, [Icons, tappable.type])

  const hasExpireTime = !!tappable.expire_timestamp
  const hasExtras = showCoords || tappable.updated
  const hasRewardIcon = !!rewardIcon
  const useRewardAsPrimary =
    displaySettings.popup.rewardAsPrimary && hasRewardIcon
  const hasTappableIcon = !!tappableIcon && !useRewardAsPrimary
  const itemDisplayName = count > 1 ? `${itemName} x${count}` : itemName
  const isLure = React.useMemo(
    () => Boolean(tappable.fort_id),
    [tappable.fort_id],
  )

  const [menuAnchorEl, setMenuAnchorEl] = React.useState(null)

  const handleExtrasToggle = React.useCallback(() => {
    useStorage.setState((prev) => ({
      popups: {
        ...prev.popups,
        extras: !popups.extras,
      },
    }))
  }, [popups.extras])

  const handleMenuOpen = React.useCallback((event) => {
    setMenuAnchorEl(event.currentTarget)
  }, [])

  const handleMenuClose = React.useCallback(() => {
    setMenuAnchorEl(null)
  }, [])

  const handleHide = React.useCallback(() => {
    setMenuAnchorEl(null)
    if (tappable.id === undefined || tappable.id === null) return
    useMemory.setState((prev) => ({
      hideList: new Set(prev.hideList).add(tappable.id),
    }))
  }, [tappable.id])

  const handleExclude = React.useCallback(() => {
    setMenuAnchorEl(null)
    if (!filterKey) return
    setDeepStore(`filters.tappables.filter.${filterKey}.enabled`, false)
  }, [filterKey])

  const handleTimer = React.useCallback(() => {
    setMenuAnchorEl(null)
    if (tappable.id === undefined || tappable.id === null) return
    useMemory.setState((prev) => {
      if (prev.timerList.includes(tappable.id)) {
        return {
          timerList: prev.timerList.filter((entry) => entry !== tappable.id),
        }
      }
      return { timerList: [...prev.timerList, tappable.id] }
    })
  }, [tappable.id])

  const menuOptions = React.useMemo(() => {
    const options = [
      { key: 'timer', label: 'timer', action: handleTimer },
      { key: 'hide', label: 'hide', action: handleHide },
    ]
    if (filterKey && filterEnabled) {
      options.push({ key: 'exclude', label: 'exclude', action: handleExclude })
    }
    return options
  }, [handleTimer, handleHide, handleExclude, filterKey, filterEnabled])

  return (
    <Grid
      container
      spacing={1}
      width={200}
      justifyContent="center"
      alignItems="center"
      textAlign="center"
    >
      <Grid
        xs={12}
        container
        alignItems="center"
        justifyContent="center"
        spacing={1}
      >
        {useRewardAsPrimary ? (
          <>
            {hasRewardIcon ? (
              <Grid xs={3} display="flex" justifyContent="center">
                <img
                  src={rewardIcon}
                  alt={itemName}
                  style={{
                    width: 35,
                    height: 35,
                    objectFit: 'contain',
                  }}
                />
              </Grid>
            ) : null}
            <Grid
              xs={hasRewardIcon ? 7 : 10}
              textAlign="center"
              display="flex"
              justifyContent="center"
              alignItems="center"
            >
              <Title>{itemDisplayName}</Title>
            </Grid>
          </>
        ) : (
          <>
            {hasTappableIcon ? (
              <Grid xs={3} display="flex" justifyContent="center">
                <img
                  src={tappableIcon}
                  alt={formattedType}
                  style={{
                    width: 40,
                    height: 40,
                    objectFit: 'contain',
                  }}
                />
              </Grid>
            ) : null}
            <Grid
              xs={hasTappableIcon ? 7 : 10}
              textAlign="center"
              display="flex"
              justifyContent="center"
              alignItems="center"
            >
              <Title>{formattedType}</Title>
            </Grid>
          </>
        )}
        <Grid
          xs={2}
          display="flex"
          justifyContent="flex-end"
          alignItems="center"
        >
          <IconButton
            aria-haspopup="true"
            onClick={handleMenuOpen}
            size="large"
          >
            <MoreVert />
          </IconButton>
        </Grid>
      </Grid>
      <Menu
        anchorEl={menuAnchorEl}
        keepMounted
        open={!!menuAnchorEl}
        onClose={handleMenuClose}
        PaperProps={{
          style: {
            maxHeight: 216,
            minWidth: '20ch',
          },
        }}
      >
        {menuOptions.map((option) => (
          <MenuItem key={option.key} onClick={option.action}>
            {t(option.label)}
          </MenuItem>
        ))}
      </Menu>
      {!useRewardAsPrimary && (
        <Grid
          xs={12}
          container
          alignItems="center"
          justifyContent="center"
          spacing={1}
        >
          {hasRewardIcon ? (
            <Grid xs={3} display="flex" justifyContent="center">
              <img
                src={rewardIcon}
                alt={itemName}
                style={{
                  maxWidth: 35,
                  maxHeight: 35,
                }}
              />
            </Grid>
          ) : null}
          <Grid xs={hasRewardIcon ? 9 : 12} textAlign="center">
            <Typography variant="caption">{itemDisplayName}</Typography>
          </Grid>
        </Grid>
      )}
      {isLure && (
        <Grid xs={12} textAlign="center">
          <Typography
            variant="caption"
            component="div"
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.75,
            }}
          >
            {t('seen_lure_wild')}
          </Typography>
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
          />
        </Grid>
      )}
      <Grid xs={hasExtras ? 6 : 12} textAlign="center">
        <Navigation lat={tappable.lat} lon={tappable.lon} />
      </Grid>
      {hasExtras && (
        <Grid xs={6} sx={{ display: 'flex', justifyContent: 'center' }}>
          <IconButton
            className={popups.extras ? 'expanded' : 'closed'}
            onClick={handleExtrasToggle}
            size="large"
          >
            <ExpandMore />
          </IconButton>
        </Grid>
      )}
      {hasExtras && (
        <Collapse in={popups.extras} timeout="auto" unmountOnExit>
          <Grid
            container
            alignItems="center"
            justifyContent="center"
            spacing={1}
            textAlign="center"
          >
            {tappable.updated && (
              <TimeStamp time={tappable.updated} xs={12}>
                last_updated
              </TimeStamp>
            )}
            {showCoords && (
              <Grid xs={12}>
                <Coords lat={tappable.lat} lon={tappable.lon} />
              </Grid>
            )}
          </Grid>
        </Collapse>
      )}
    </Grid>
  )
}

/**
 * @param {{
 *  expireTimestamp: number,
 *  verified: boolean
 * }} props
 */
const TappableTimer = ({ expireTimestamp, verified }) => {
  const { t, i18n } = useTranslation()
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
          {new Date(expireTimeMs).toLocaleTimeString(i18n.language || 'en', {
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
        >
          <StatusIcon status={verified} />
        </Tooltip>
      </Grid>
    </>
  )
}

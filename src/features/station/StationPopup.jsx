/* eslint-disable react/destructuring-assignment */
// @ts-check
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import Card from '@mui/material/Card'
import CardMedia from '@mui/material/CardMedia'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Collapse from '@mui/material/Collapse'
import ExpandMore from '@mui/icons-material/ExpandMore'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import Grid from '@mui/material/Unstable_Grid2'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Box from '@mui/material/Box'

import { useMemory } from '@store/useMemory'
import { setDeepStore, useGetDeepStore, useStorage } from '@store/useStorage'
import { Navigation } from '@components/popups/Navigation'
import { useTranslateById } from '@hooks/useTranslateById'
import { PokeType } from '@components/popups/PokeType'
import { GenderIcon } from '@components/popups/GenderIcon'
import { Img, PokemonImg } from '@components/Img'
import { useFormatStore } from '@store/useFormatStore'
import { useRelativeTimer } from '@hooks/useRelativeTime'
import { useAnalytics } from '@hooks/useAnalytics'
import { BackgroundCard } from '@components/popups/BackgroundCard'
import { Title } from '@components/popups/Title'
import {
  CollapseWithState,
  ExpandCollapse,
  ExpandWithState,
} from '@components/inputs/ExpandCollapse'
import { VirtualGrid } from '@components/virtual/VirtualGrid'
import { getStationDamageBoost } from '@utils/getAttackBonus'
import { getTimeUntil } from '@utils/getTimeUntil'
import { getFormDisplay } from '@utils/getFormDisplay'
import { CopyCoords } from '@components/popups/Coords'
import Tooltip from '@mui/material/Tooltip'
import { usePokemonBackgroundVisuals } from '@hooks/usePokemonBackgroundVisuals'

import { useGetStationMons } from './useGetStationMons'

/** @param {import('@rm/types').Station} station */
export function StationPopup(station) {
  useAnalytics('Popup', 'Station')

  return (
    <Card sx={{ width: 200 }} elevation={0}>
      <Box display="flex" alignItems="center" justifyContent="space-evenly">
        <StationHeader {...station} />
        <StationMenu {...station} />
      </Box>
      <StationMedia {...station} />
      {station.battle_start < Date.now() / 1000 &&
        station.battle_end > Date.now() / 1000 &&
        !!station.total_stationed_pokemon && (
          <ExpandCollapse>
            <StationAttackBonus {...station} />
            <ExpandWithState
              field="popups.stationExtras"
              disabled={!station.total_stationed_pokemon}
            />
            <CollapseWithState
              field="popups.stationExtras"
              in={!!station.total_stationed_pokemon}
            >
              <StationMons {...station} />
            </CollapseWithState>
          </ExpandCollapse>
        )}
      <StationContent {...station} />
      <Footer lat={station.lat} lon={station.lon} />
      <ExtraInfo {...station} />
    </Card>
  )
}

/** @param {import('@rm/types').Station} props */
function StationHeader({ name }) {
  const { t } = useTranslation()

  return (
    <CardHeader
      title={
        <Title
          align="left"
          variant="subtitle1"
          fontWeight="bold"
          backup={t('unknown_station')}
          maxWidth={168}
        >
          {name}
        </Title>
      }
      sx={{ p: 0 }}
    />
  )
}

/** @param {import('@rm/types').Station} props */
const Footer = ({ lat, lon }) => {
  const open = useStorage((s) => !!s.popups.extras)

  return (
    <Grid container xs={12} justifyContent="space-evenly" alignItems="center">
      <Grid xs={3}>
        <Navigation lat={lat} lon={lon} />
      </Grid>
      <Grid xs={3} textAlign="center">
        <IconButton
          className={open ? 'expanded' : 'closed'}
          onClick={() =>
            useStorage.setState((prev) => ({
              popups: { ...prev.popups, extras: !open },
            }))
          }
          size="large"
        >
          <ExpandMore />
        </IconButton>
      </Grid>
    </Grid>
  )
}

/** @param {import('@rm/types').Station} props */
const ExtraInfo = ({ updated }) => {
  const open = useStorage((s) => s.popups.extras)
  const { t } = useTranslation()
  const dateFormatter = useFormatStore((s) => s.dateFormat)

  return (
    <Collapse in={open} timeout="auto" unmountOnExit sx={{ width: '100%' }}>
      <Grid container alignItems="center" justifyContent="center">
        &nbsp;{t('last_seen')}:<br />
        {dateFormatter.format(new Date(updated * 1000))}
      </Grid>
    </Collapse>
  )
}

/** @param {import('@rm/types').Station} props */
function StationMenu({
  id,
  battle_level,
  battle_pokemon_id,
  battle_pokemon_form,
  lat,
  lon,
}) {
  const copyCoords = useGetDeepStore(
    'userSettings.stations.enableStationPopupCoords',
    false,
  )
  const [anchorEl, setAnchorEl] = React.useState(null)
  const { t } = useTranslation()

  const handleClick = React.useCallback(
    (event) => setAnchorEl(event.currentTarget),
    [],
  )
  const handleClose = React.useCallback(() => setAnchorEl(null), [])

  const options = React.useMemo(
    () => [
      {
        name: 'hide',
        action: () =>
          useMemory.setState((prev) => ({
            hideList: new Set(prev.hideList).add(id),
          })),
      },
      {
        name: 'exclude_battle',
        action: () =>
          setDeepStore(
            `filters.stations.filter.${
              battle_pokemon_id > 0
                ? `${battle_pokemon_id}-${battle_pokemon_form}`
                : `j${battle_level}`
            }.enabled`,
            false,
          ),
      },
      {
        name: 'timer',
        action: () =>
          useMemory.setState((prev) => {
            if (prev.timerList.includes(id)) {
              return { timerList: prev.timerList.filter((x) => x !== id) }
            }
            return { timerList: [...prev.timerList, id] }
          }),
      },
    ],
    [battle_level, battle_pokemon_form, battle_pokemon_id, id],
  )

  return (
    <>
      <IconButton aria-label="actions" onClick={handleClick}>
        <MoreVertIcon />
      </IconButton>
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={handleClose}>
        {options.map((option) => (
          <MenuItem
            key={option.name}
            onClick={() => {
              handleClose()
              option.action()
            }}
            dense
          >
            {t(option.name)}
          </MenuItem>
        ))}
        {copyCoords && <CopyCoords lat={lat} lon={lon} onClick={handleClose} />}
      </Menu>
    </>
  )
}

/** @param {import('@rm/types').Station} props */
function StationMedia({
  battle_pokemon_id,
  battle_pokemon_form,
  battle_pokemon_alignment,
  battle_pokemon_costume,
  battle_pokemon_gender,
  battle_pokemon_bread_mode,
  battle_level,
  battle_end,
  battle_start,
  end_time,
  is_battle_available,
  battle_pokemon_stamina,
  battle_pokemon_cp_multiplier,
  battle_pokemon_estimated_cp,
}) {
  const { t } = useTranslation()
  const nowSeconds = Date.now() / 1000
  const hasBattleEnd = Number.isFinite(battle_end)
  const hasBattleStart = Number.isFinite(battle_start)
  const hasEndTime = Number.isFinite(end_time)
  const battleEndEpoch = hasBattleEnd ? battle_end : 0
  const battleStartEpoch = hasBattleStart ? battle_start : 0
  const isBattleActive = battleEndEpoch > nowSeconds
  const isStarting = hasBattleStart && battleStartEpoch > nowSeconds
  const isBattleEndSameAsExpire =
    hasBattleEnd && hasEndTime && battle_end === end_time
  const countdownEpoch = isStarting ? battleStartEpoch : battleEndEpoch
  const showBattleCountdown = countdownEpoch > 0 && !isBattleEndSameAsExpire
  const showBreadWindow =
    !is_battle_available &&
    showBattleCountdown &&
    hasBattleStart &&
    battleStartEpoch < nowSeconds &&
    battleEndEpoch > nowSeconds
  const types = useMemory((s) => {
    if (!battle_pokemon_id) return []
    const poke = s.masterfile.pokemon[battle_pokemon_id]
    if (poke?.forms?.[battle_pokemon_form]?.types) {
      return poke.forms[battle_pokemon_form]?.types || []
    }
    return poke?.types || []
  })
  const battleStaminaDisplay =
    typeof battle_pokemon_stamina === 'number'
      ? battle_pokemon_stamina.toString()
      : null
  const estimatedCpDisplay = Number.isFinite(battle_pokemon_estimated_cp)
    ? Number(battle_pokemon_estimated_cp).toString()
    : null
  const cpMultiplierDisplay = Number.isFinite(battle_pokemon_cp_multiplier)
    ? `${battle_pokemon_cp_multiplier}`
    : null
  const cpLabel = t('cp')
  const hpLabel = t('hp')
  const pokemonFormLabel = getFormDisplay(
    battle_pokemon_id,
    battle_pokemon_form,
    battle_pokemon_costume,
  )
  let cpTooltip = null
  let cpLine = null
  if (estimatedCpDisplay) {
    if (cpMultiplierDisplay) {
      cpTooltip = t('station_battle_cp_multiplier', {
        value: cpMultiplierDisplay,
      })
      if (battle_level >= 5) {
        cpTooltip = `${cpTooltip}${t('station_battle_cp_tooltip_extra')}`
      }
    }
    const cpTypography = (
      <Typography variant="caption" align="center">
        {cpLabel} {estimatedCpDisplay}
      </Typography>
    )
    cpLine = cpTooltip ? (
      <Tooltip title={cpTooltip} arrow placement="top">
        <Box
          component="span"
          sx={{
            cursor: 'help',
            textDecoration: 'underline dotted',
            display: 'inline-block',
          }}
        >
          {cpTypography}
        </Box>
      </Tooltip>
    ) : (
      cpTypography
    )
  } else if (cpMultiplierDisplay) {
    cpLine = (
      <Typography variant="caption" align="center">
        {t('station_battle_cp_multiplier', { value: cpMultiplierDisplay })}
      </Typography>
    )
  }
  const showStatsRow = Boolean(cpLine || battleStaminaDisplay)

  if (!isBattleActive) {
    return null
  }

  const countdownContent = showBattleCountdown ? (
    <CardContent sx={{ pt: 1, pb: 0 }}>
      <Stack spacing={0.5} alignItems="center" width="100%">
        <StationBattleTimer start={isStarting} epoch={countdownEpoch} />
        {showBreadWindow && (
          <Typography variant="caption" align="center">
            {t('bread_time_window')}
          </Typography>
        )}
      </Stack>
    </CardContent>
  ) : null

  return (
    <>
      <CardMedia>
        <Box className="popup-card-media">
          <Stack className="flex-center">
            <PokemonImg
              id={battle_pokemon_id}
              form={battle_pokemon_form}
              costume={battle_pokemon_costume}
              bread={battle_pokemon_bread_mode}
              alignment={battle_pokemon_alignment}
              gender={battle_pokemon_gender}
              maxHeight="80%"
              maxWidth="100%"
            />
            {!!pokemonFormLabel && (
              <Box textAlign="center">
                <Typography variant="caption">
                  &nbsp;({pokemonFormLabel})
                </Typography>
              </Box>
            )}
          </Stack>
          <Stack
            alignItems="center"
            justifyContent="center"
            spacing={0.5}
            width="100%"
          >
            <Stack
              direction="row"
              justifyContent="space-evenly"
              width="100%"
              pb={0.5}
            >
              {!!battle_pokemon_gender && (
                <GenderIcon gender={battle_pokemon_gender} fontSize="medium" />
              )}
              {types.map((type) => (
                <PokeType key={type} id={type} size="medium" />
              ))}
            </Stack>
            {!!battle_level && (
              <Typography variant="caption" align="center">
                {t(`max_battle_${battle_level}`)}
              </Typography>
            )}
            {showStatsRow && (
              <Stack spacing={0} alignItems="center">
                {cpLine}
                {battleStaminaDisplay && (
                  <Typography variant="caption" align="center">
                    {hpLabel} {battleStaminaDisplay}
                  </Typography>
                )}
              </Stack>
            )}
          </Stack>
        </Box>
      </CardMedia>
      {countdownContent}
    </>
  )
}
/** @param {import('@rm/types').Station} station */
function StationAttackBonus({ total_stationed_pokemon, total_stationed_gmax }) {
  const { t } = useTranslation()
  return (
    <Stack alignItems="center">
      <Typography variant="caption">
        {t('battle_bonus')}: +{getStationDamageBoost(total_stationed_pokemon)}%
        <br />
        {t('placed_pokemon')}:{' '}
        {total_stationed_gmax === undefined || total_stationed_gmax === null
          ? ''
          : `${total_stationed_gmax}/`}
        {total_stationed_pokemon}/40
      </Typography>
    </Stack>
  )
}

/** @param {import('@rm/types').Station} station */
function StationContent({ start_time, end_time, battle_end, id }) {
  const { t } = useTranslation()
  const dateFormatter = useFormatStore((s) => s.dateFormat)
  const now = Date.now() / 1000
  const hasEndTime = Number.isFinite(end_time)
  const endEpoch = hasEndTime ? end_time : 0
  const isInactive = hasEndTime && endEpoch < now
  const inactiveRelativeTime = useRelativeTimer(endEpoch || 0)

  if (isInactive) {
    const formatted = dateFormatter.format(new Date(endEpoch * 1000))
    return (
      <CardContent sx={{ p: 0 }}>
        <Stack alignItems="center" justifyContent="center">
          <Typography variant="subtitle2">
            {t('inactive_since', { time: inactiveRelativeTime })}
          </Typography>
          <Typography variant="caption">
            {t('last_active', { time: formatted })}
          </Typography>
        </Stack>
      </CardContent>
    )
  }

  const hasStartTime = Number.isFinite(start_time)
  const startEpoch = hasStartTime ? start_time : 0
  const isFutureStart = hasStartTime && startEpoch > now
  const displayInactiveOnly =
    Number.isFinite(battle_end) && hasEndTime && battle_end === endEpoch
  const epoch = displayInactiveOnly
    ? endEpoch
    : isFutureStart
      ? startEpoch
      : endEpoch

  return (
    <CardContent sx={{ p: 0 }}>
      <Stack alignItems="center" justifyContent="center">
        {displayInactiveOnly || !isFutureStart ? (
          <StationTimeStamp epoch={epoch} id={id} />
        ) : (
          <StationTimeStamp start epoch={epoch} id={id} />
        )}
        <StaticTimeStamp date epoch={epoch} />
      </Stack>
    </CardContent>
  )
}

/** @param {import('@rm/types').Station} props */
function StationMons({ id, updated }) {
  const { t: tId } = useTranslateById()
  const { t } = useTranslation()
  const mons = useGetStationMons(id, updated)
  const icons = useMemory((s) => s.Icons)
  const resolveBackgroundVisual = usePokemonBackgroundVisuals()
  const bestBuddyIcon = icons?.getMisc?.('bestbuddy')

  return (
    <CardContent
      sx={{ m: 0, p: 0, height: 130, pb: 0, '&:last-child': { pb: 0 } }}
    >
      <VirtualGrid data={mons} xs={1} context={{ columns: 5 }}>
        {(index, mon) => {
          const caption = tId(`${mon.pokemon_id}-${mon.form}`)
          const visuals = resolveBackgroundVisual(mon.background)
          const { hasBackground } = visuals
          const backgroundTooltip = visuals.backgroundMeta?.tooltip
          const tooltipTitle = backgroundTooltip ? (
            <>
              {caption}
              <br />
              {backgroundTooltip}
            </>
          ) : (
            caption
          )
          return (
            <BackgroundCard
              visuals={hasBackground ? visuals : undefined}
              tooltip={tooltipTitle}
              contentProps={{
                sx: {
                  height: 40,
                  width: 40,
                  mx: 'auto',
                },
              }}
            >
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                width="100%"
                height="100%"
              >
                <Box
                  position="relative"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  width={40}
                  height={40}
                >
                  <Img
                    key={index}
                    src={icons.getPokemonByDisplay(mon.pokemon_id, mon)}
                    alt={caption}
                    maxHeight={40}
                    maxWidth={40}
                  />
                  {mon.badge === 1 && bestBuddyIcon ? (
                    <Img
                      src={bestBuddyIcon}
                      alt={t('best_buddy')}
                      maxHeight={12}
                      maxWidth={12}
                      style={{ position: 'absolute', top: 0, right: 0 }}
                    />
                  ) : null}
                </Box>
              </Box>
            </BackgroundCard>
          )
        }}
      </VirtualGrid>
    </CardContent>
  )
}

/**
 * @param {{ start?: boolean, epoch: number }} props
 */
function StationBattleTimer({ start = false, epoch }) {
  const { t } = useTranslation()
  const hasEpoch = Number.isFinite(epoch) && epoch > 0
  const target = hasEpoch ? epoch * 1000 : 0
  const update = React.useCallback(() => getTimeUntil(target, true), [target])
  const [display, setDisplay] = React.useState(() =>
    target ? update() : { str: '0s', diff: 0 },
  )

  React.useEffect(() => {
    if (!target) return undefined
    const timer = setTimeout(() => setDisplay(update()), 1000)
    return () => clearTimeout(timer)
  })

  if (!target) {
    return null
  }

  const locale = localStorage.getItem('i18nextLng') || 'en'

  return (
    <Stack spacing={0} alignItems="center" width="100%">
      <Typography variant="subtitle1" align="center">
        {t(start ? 'starts' : 'ends')}:{' '}
        {new Date(target).toLocaleTimeString(locale)}
      </Typography>
      <Typography variant="h6" align="center">
        {display.str.replace('days', t('days')).replace('day', t('day'))}
      </Typography>
    </Stack>
  )
}

/**
 * @param {{ start?: boolean, epoch: number } & import('@mui/material').TypographyProps} props
 */
function StationTimeStamp({ start = false, epoch, ...props }) {
  const { t } = useTranslation()
  const relativeTime = useRelativeTimer(epoch || 0)

  return (
    <Typography variant="subtitle2" {...props}>
      {start ? t('active') : t('inactive')}
      &nbsp;
      {relativeTime}
    </Typography>
  )
}

/**
 * @param {{ start?: boolean, date?: boolean, epoch: number } & import('@mui/material').TypographyProps} props
 */
function StaticTimeStamp({ date = false, epoch, ...props }) {
  const formatter = useFormatStore((s) => (date ? s.dateFormat : s.timeFormat))
  return (
    <Typography variant="caption" {...props}>
      {formatter.format(new Date(epoch * 1000))}
    </Typography>
  )
}

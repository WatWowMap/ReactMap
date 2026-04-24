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
import Divider from '@mui/material/Divider'

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
import { getFormDisplay } from '@utils/getFormDisplay'
import { CopyCoords } from '@components/popups/Coords'
import Tooltip from '@mui/material/Tooltip'
import { usePokemonBackgroundVisuals } from '@hooks/usePokemonBackgroundVisuals'

import { getStationBattleKey, getStationBattleState } from './battleState'
import { useGetStationMons } from './useGetStationMons'

/**
 * @param {import('@rm/types').AllFilters['stations'] | undefined} filters
 */
function getDisplayedBattleFilters(filters) {
  if (!filters?.maxBattles || filters?.allStations) {
    return null
  }

  const onlyBattleTier = filters.battleTier ?? 'all'
  const battleLevels = new Set()
  const battleCombos = new Map()

  if (onlyBattleTier === 'all') {
    Object.entries(filters.filter || {}).forEach(([key, value]) => {
      if (!value?.enabled) return
      if (key.startsWith('j')) {
        const parsedLevel = Number(key.slice(1))
        if (Number.isFinite(parsedLevel)) {
          battleLevels.add(parsedLevel)
        }
        return
      }
      if (/^\d+-/.test(key)) {
        const [idPart, formPart] = key.split('-', 2)
        const pokemonId = Number(idPart)
        if (!Number.isFinite(pokemonId)) return
        let formValue = null
        if (formPart && formPart !== 'null') {
          const parsedForm = Number(formPart)
          if (!Number.isFinite(parsedForm)) return
          formValue = parsedForm
        }
        battleCombos.set(`${pokemonId}-${formValue ?? 'null'}`, {
          pokemonId,
          form: formValue,
        })
      }
    })
  }

  if (
    onlyBattleTier === 'all' &&
    battleLevels.size === 0 &&
    battleCombos.size === 0
  ) {
    return null
  }

  return {
    onlyBattleTier,
    battleLevels: [...battleLevels],
    battleCombos: [...battleCombos.values()],
  }
}

/**
 * @param {import('@rm/types').StationBattle | null | undefined} battle
 * @param {ReturnType<typeof getDisplayedBattleFilters>} filters
 */
function matchesDisplayedBattleFilter(battle, filters) {
  if (!filters) return true
  if (filters.onlyBattleTier !== 'all') {
    return Number(battle?.battle_level) === Number(filters.onlyBattleTier)
  }
  const battleLevel = Number(battle?.battle_level)
  const pokemonId = Number(battle?.battle_pokemon_id)
  const pokemonForm =
    battle?.battle_pokemon_form === null
      ? null
      : Number(battle?.battle_pokemon_form)

  return (
    filters.battleLevels.includes(battleLevel) ||
    filters.battleCombos.some(
      ({ pokemonId: filterPokemonId, form }) =>
        pokemonId === filterPokemonId && pokemonForm === form,
    )
  )
}

/** @param {import('@rm/types').Station} station */
export function StationPopup(station) {
  useAnalytics('Popup', 'Station')
  const now = Date.now() / 1000
  const stationFilters = useStorage((s) => s.filters?.stations)
  const battleState = getStationBattleState(station, now, {
    includeUpcoming: stationFilters?.includeUpcoming ?? true,
  })
  const visibleBattleKey = battleState.visibleBattle
    ? getStationBattleKey(battleState.visibleBattle)
    : ''
  const displayedBattleFilters = React.useMemo(
    () => getDisplayedBattleFilters(stationFilters),
    [stationFilters],
  )
  const displayedPopupBattles = React.useMemo(
    () =>
      battleState.popupBattles.filter(
        (battle) =>
          getStationBattleKey(battle) === visibleBattleKey ||
          matchesDisplayedBattleFilter(battle, displayedBattleFilters),
      ),
    [battleState.popupBattles, displayedBattleFilters, visibleBattleKey],
  )
  const hasVisibleBattle = !!battleState.visibleBattle

  return (
    <Card sx={{ width: 200 }} elevation={0}>
      <Box display="flex" alignItems="center" justifyContent="space-evenly">
        <StationHeader {...station} />
        <StationMenu {...station} battles={displayedPopupBattles} />
      </Box>
      <StationBattles
        popupBattles={displayedPopupBattles}
        visibleBattle={battleState.visibleBattle}
        is_battle_available={station.is_battle_available}
      />
      {hasVisibleBattle && !!station.total_stationed_pokemon && (
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
      <StationContent {...station} battles={displayedPopupBattles} />
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

/** @param {import('@rm/types').Station & {
 *  battles?: import('@rm/types').StationBattle[]
 * }} props */
function StationMenu({ id, lat, lon, battles = [] }) {
  const copyCoords = useGetDeepStore(
    'userSettings.stations.enableStationPopupCoords',
    false,
  )
  const [anchorEl, setAnchorEl] = React.useState(null)
  const { t } = useTranslation()
  const { t: tId } = useTranslateById()

  const handleClick = React.useCallback(
    (event) => setAnchorEl(event.currentTarget),
    [],
  )
  const handleClose = React.useCallback(() => setAnchorEl(null), [])

  const battleOptions = React.useMemo(() => {
    const actionableBattles = [...battles].filter(
      (battle) =>
        Number(battle?.battle_pokemon_id) > 0 ||
        Number(battle?.battle_level) > 0,
    )

    return actionableBattles.reduce((acc, battle) => {
      const battleKey = getStationBattleKey(battle)
      const filterKey =
        Number(battle?.battle_pokemon_id) > 0
          ? `${battle.battle_pokemon_id}-${battle.battle_pokemon_form}`
          : `j${battle?.battle_level}`
      if (acc.some((option) => option.filterKey === filterKey)) {
        return acc
      }
      const battleLabel =
        Number(battle?.battle_pokemon_id) > 0
          ? battle?.battle_pokemon_form === null
            ? tId(`${battle.battle_pokemon_id}`)
            : tId(`${battle.battle_pokemon_id}-${battle.battle_pokemon_form}`)
          : t(`max_battle_${battle?.battle_level}`)

      acc.push({
        filterKey,
        key: `exclude_${battleKey}`,
        label: t('exclude_battle_multi', { battle: battleLabel }),
        action: () =>
          setDeepStore(`filters.stations.filter.${filterKey}.enabled`, false),
      })
      return acc
    }, [])
  }, [battles, t, tId])

  const options = React.useMemo(
    () => [
      {
        key: 'hide',
        label: t('hide'),
        action: () =>
          useMemory.setState((prev) => ({
            hideList: new Set(prev.hideList).add(id),
          })),
      },
      ...battleOptions,
      {
        key: 'timer',
        label: t('timer'),
        action: () =>
          useMemory.setState((prev) => {
            if (prev.timerList.includes(id)) {
              return { timerList: prev.timerList.filter((x) => x !== id) }
            }
            return { timerList: [...prev.timerList, id] }
          }),
      },
    ],
    [battleOptions, id, t],
  )

  return (
    <>
      <IconButton aria-label="actions" onClick={handleClick}>
        <MoreVertIcon />
      </IconButton>
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={handleClose}>
        {options.map((option) => (
          <MenuItem
            key={option.key}
            onClick={() => {
              handleClose()
              option.action()
            }}
            dense
          >
            {option.label}
          </MenuItem>
        ))}
        {copyCoords && <CopyCoords lat={lat} lon={lon} onClick={handleClose} />}
      </Menu>
    </>
  )
}

/**
 * @param {{
 *  popupBattles: import('@rm/types').StationBattle[]
 *  visibleBattle: import('@rm/types').StationBattle | null
 *  is_battle_available: boolean
 * }} props
 */
function StationBattles({ popupBattles, visibleBattle, is_battle_available }) {
  if (!popupBattles.length) {
    return null
  }

  const primaryBattle = visibleBattle || popupBattles[0] || null

  return popupBattles.map((battle, index) => (
    <React.Fragment key={getStationBattleKey(battle)}>
      {!!index && <Divider light flexItem className="popup-divider" />}
      <StationBattleSection
        {...battle}
        primary={
          getStationBattleKey(battle) === getStationBattleKey(primaryBattle)
        }
        is_battle_available={is_battle_available}
        hidden={
          !!primaryBattle &&
          getStationBattleKey(battle) !== getStationBattleKey(primaryBattle)
        }
      />
    </React.Fragment>
  ))
}

/**
 * @param {import('@rm/types').StationBattle & {
 *  hidden?: boolean
 *  primary?: boolean
 *  is_battle_available: boolean
 * }} props
 */
function StationBattleSection({
  battle_pokemon_id,
  battle_pokemon_form,
  battle_pokemon_alignment,
  battle_pokemon_costume,
  battle_pokemon_gender,
  battle_pokemon_bread_mode,
  battle_level,
  battle_end,
  battle_start,
  updated,
  hidden = false,
  primary = false,
  is_battle_available,
  battle_pokemon_stamina,
  battle_pokemon_cp_multiplier,
  battle_pokemon_estimated_cp,
}) {
  const { t } = useTranslation()
  const nowSeconds = Date.now() / 1000
  const battleEndEpoch = Number(battle_end)
  const battleStartEpoch = Number(battle_start)
  const hasBattleEnd = Number.isFinite(battleEndEpoch) && battleEndEpoch > 0
  const hasBattleStart =
    Number.isFinite(battleStartEpoch) && battleStartEpoch > 0
  const isBattleActive =
    hasBattleEnd &&
    battleEndEpoch > nowSeconds &&
    (!hasBattleStart || battleStartEpoch <= nowSeconds)
  const showUpcomingStartTimer =
    primary &&
    hasBattleStart &&
    battleStartEpoch > nowSeconds &&
    hasBattleEnd &&
    battleEndEpoch > nowSeconds
  const timerEpoch = showUpcomingStartTimer ? battleStartEpoch : battleEndEpoch
  const showLiveCountdown =
    (!hidden && isBattleActive) || showUpcomingStartTimer
  const showBreadWindow =
    !showUpcomingStartTimer &&
    showLiveCountdown &&
    !is_battle_available &&
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
  const textColor = hidden ? 'GrayText' : 'inherit'
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
      <Typography variant="caption" align="center" color={textColor}>
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
      <Typography variant="caption" align="center" color={textColor}>
        {t('station_battle_cp_multiplier', { value: cpMultiplierDisplay })}
      </Typography>
    )
  }
  const showStatsRow = Boolean(cpLine || battleStaminaDisplay)

  if (!isBattleActive) {
    if (!(hasBattleEnd && battleEndEpoch > nowSeconds)) {
      return null
    }
  }

  const countdownContent = hasBattleEnd ? (
    <CardContent sx={{ pt: 1, pb: 0 }}>
      <Stack spacing={0.5} alignItems="center" width="100%">
        <StationBattleTimer
          epoch={timerEpoch}
          updated={updated}
          start={showUpcomingStartTimer}
          countdown={showLiveCountdown}
          hidden={hidden}
        />
        {showBreadWindow && (
          <Typography variant="caption" align="center" color={textColor}>
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
            {!!battle_pokemon_id && (
              <PokemonImg
                id={battle_pokemon_id}
                form={battle_pokemon_form}
                costume={battle_pokemon_costume}
                bread={battle_pokemon_bread_mode}
                alignment={battle_pokemon_alignment}
                gender={battle_pokemon_gender}
                maxHeight="80%"
                maxWidth="100%"
                className={hidden ? 'disable-image' : undefined}
                style={hidden ? { opacity: 0.65 } : undefined}
              />
            )}
            {!!pokemonFormLabel && (
              <Box textAlign="center">
                <Typography variant="caption" color={textColor}>
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
              sx={hidden ? { opacity: 0.65 } : undefined}
            >
              {!!battle_pokemon_gender && (
                <GenderIcon
                  gender={battle_pokemon_gender}
                  fontSize="medium"
                  color={hidden ? 'disabled' : undefined}
                />
              )}
              {types.map((type) => (
                <PokeType key={type} id={type} size="medium" />
              ))}
            </Stack>
            {!!battle_level && (
              <Typography variant="caption" align="center" color={textColor}>
                {t(`max_battle_${battle_level}`)}
              </Typography>
            )}
            {showStatsRow && (
              <Stack spacing={0} alignItems="center">
                {cpLine}
                {battleStaminaDisplay && (
                  <Typography
                    variant="caption"
                    align="center"
                    color={textColor}
                  >
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

/**
 * @param {import('@rm/types').StationBattle[]} battles
 * @param {(battle: import('@rm/types').StationBattle) => number} getEpoch
 * @param {(epoch: number) => boolean} include
 * @param {(...values: number[]) => number} compare
 * @returns {number | null}
 */
function getBattleTimerEpoch(battles, getEpoch, include, compare) {
  const epochs = battles.map(getEpoch).filter(include)
  return epochs.length ? compare(...epochs) : null
}

/** @param {import('@rm/types').Station & { battles?: import('@rm/types').StationBattle[] }} station */
function StationContent({ start_time, end_time, id, battles = [] }) {
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
  const earliestBattleStart = getBattleTimerEpoch(
    battles,
    (battle) => Number(battle?.battle_start),
    (epoch) => Number.isFinite(epoch) && epoch > now,
    Math.min,
  )
  const latestBattleEnd = getBattleTimerEpoch(
    battles,
    (battle) => Number(battle?.battle_end),
    (epoch) => Number.isFinite(epoch) && epoch > now,
    Math.max,
  )
  if (
    (isFutureStart && earliestBattleStart === startEpoch) ||
    (!isFutureStart && latestBattleEnd === endEpoch)
  ) {
    return null
  }

  const epoch = isFutureStart ? startEpoch : endEpoch

  return (
    <CardContent sx={{ p: 0 }}>
      <Stack alignItems="center" justifyContent="center">
        {isFutureStart ? (
          <StationTimeStamp start epoch={epoch} id={id} />
        ) : (
          <StationTimeStamp epoch={epoch} id={id} />
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
  const scrollerEl = React.useRef(/** @type {HTMLElement | null} */ (null))
  const resizeObserver = React.useRef(
    /** @type {ResizeObserver | null} */ (null),
  )
  const [iconSize, setIconSize] = React.useState(40)
  const columns = 5
  const maxRows = 3
  const visibleRows = Math.min(
    maxRows,
    Math.max(1, Math.ceil(mons.length / columns)),
  )
  const gridHeight = visibleRows * iconSize

  const recomputeIconSize = React.useCallback(() => {
    const el = scrollerEl.current
    if (!el) return
    const perColumn = Math.floor(el.clientWidth / columns)
    const nextSize = Math.min(40, perColumn || 40)
    setIconSize((prev) => (prev === nextSize ? prev : nextSize))
  }, [columns])

  const handleScrollerRef = React.useCallback(
    (ref) => {
      if (resizeObserver.current) {
        resizeObserver.current.disconnect()
        resizeObserver.current = null
      }
      scrollerEl.current = ref
      if (ref) {
        recomputeIconSize()
        if (typeof ResizeObserver !== 'undefined') {
          const observer = new ResizeObserver(() => recomputeIconSize())
          observer.observe(ref)
          resizeObserver.current = observer
        }
      }
    },
    [recomputeIconSize],
  )

  React.useLayoutEffect(() => {
    recomputeIconSize()
  }, [mons.length, recomputeIconSize])

  return (
    <CardContent
      sx={{
        m: 0,
        p: 0,
        height: gridHeight,
        pb: 0,
        '&:last-child': { pb: 0 },
      }}
    >
      <VirtualGrid
        data={mons}
        xs={1}
        context={{ columns }}
        scrollerRef={handleScrollerRef}
      >
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
                  mx: 'auto',
                  width: iconSize,
                  height: iconSize,
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
                  sx={{
                    width: iconSize,
                    height: iconSize,
                  }}
                >
                  <Img
                    key={index}
                    src={icons.getPokemonByDisplay(mon.pokemon_id, mon)}
                    alt={caption}
                    maxHeight="100%"
                    maxWidth="100%"
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
 * @param {{
 *  epoch: number
 *  updated?: number
 *  start?: boolean
 *  countdown?: boolean
 *  hidden?: boolean
 * }} props
 */
function StationBattleTimer({
  epoch,
  updated,
  start = false,
  countdown = false,
  hidden = false,
}) {
  const { t } = useTranslation()
  const hasEpoch = Number.isFinite(epoch) && epoch > 0
  const updatedEpoch = Number(updated)
  const hasUpdated = Number.isFinite(updatedEpoch) && updatedEpoch > 0
  const target = hasEpoch ? epoch * 1000 : 0
  const timeFormatter = useFormatStore((s) => s.timeFormat)
  const dateFormatter = useFormatStore((s) => s.dateFormat)
  const relativeTime = useRelativeTimer(countdown ? epoch : 0)

  if (!target) {
    return null
  }

  const textColor = hidden ? 'GrayText' : 'inherit'

  return (
    <Stack spacing={0} alignItems="center" width="100%">
      <Typography variant="subtitle1" align="center" color={textColor}>
        {t(start ? 'starts' : 'ends')}: {timeFormatter.format(new Date(target))}
      </Typography>
      {countdown ? (
        <Typography variant="h6" align="center" color={textColor}>
          {relativeTime}
        </Typography>
      ) : (
        hasUpdated && (
          <Typography variant="caption" align="center" color={textColor}>
            {t('last_seen')}:{' '}
            {dateFormatter.format(new Date(updatedEpoch * 1000))}
          </Typography>
        )
      )}
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

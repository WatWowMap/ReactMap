/* eslint-disable react/destructuring-assignment */
// @ts-check
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import Card from '@mui/material/Card'
import CardMedia from '@mui/material/CardMedia'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import CardHeader from '@mui/material/CardHeader'
import Collapse from '@mui/material/Collapse'
import ExpandMore from '@mui/icons-material/ExpandMore'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import Grid from '@mui/material/Unstable_Grid2'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Rating from '@mui/material/Rating'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Box from '@mui/material/Box'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import LockIcon from '@mui/icons-material/Lock'

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
import { Title } from '@components/popups/Title'
import {
  CollapseWithState,
  ExpandCollapse,
  ExpandWithState,
} from '@components/inputs/ExpandCollapse'
import { VirtualGrid } from '@components/virtual/VirtualGrid'
import { getStationAttackBonus } from '@utils/getAttackBonus'
import { CopyCoords } from '@components/popups/Coords'
import { PokeMove } from '@components/popups/PokeMove'

import { useGetStationMons } from './useGetStationMons'

/** @param {import('@rm/types').Station} station */
export function StationPopup(station) {
  useAnalytics('Popup', 'Station')

  return (
    <Card sx={{ width: 200 }} elevation={0}>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-evenly"
      >
        <StationHeader {...station} />
        <StationMenu {...station} />
      </Box>
      {!!station.battle_level && station.battle_end > Date.now() / 1000 && <StationRating {...station} />}
      <StationMedia {...station} />
      {!!station.is_battle_available &&
        station.battle_start < Date.now() / 1000 &&
        station.battle_end > Date.now() / 1000 && (
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
function StationRating({
  battle_level,
  battle_start,
  battle_end,
  is_battle_available,
  start_time,
  end_time,
}) {
  const { t } = useTranslation()
  const isStarting = battle_start > Date.now() / 1000
  const battle_start_time = (battle_start == start_time) ? battle_start + 60 * 60 : battle_start
  const battle_end_time = ((battle_end == end_time) && (battle_end > Date.now() / 1000 + 60 * 60)) ? battle_end - 60 * 60 * 8 : battle_end
  const epoch = isStarting ? battle_start_time : battle_end_time
  return (
    <CardContent sx={{ p: 0, py: 1 }}>
      <Stack alignItems="center" justifyContent="center">
        <Rating value={battle_level} max={Math.max(5, battle_level)} readOnly />
        <Typography variant="caption">
          {t(`max_battle_${battle_level}`)}
        </Typography>
        <LiveTimeStamp start={isStarting} epoch={epoch} variant="caption" />
        {!is_battle_available &&
          battle_start < Date.now() / 1000 &&
          battle_end_time > Date.now() / 1000 && (
            <Typography variant="caption" align="center">
              {t('bread_time_window')}
            </Typography>
        )}
      </Stack>
    </CardContent>
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
const ExtraInfo = ({ updated, lat, lon }) => {
  const open = useStorage((s) => s.popups.extras)
  const { t } = useTranslation()
  const dateFormatter = useFormatStore((s) => s.dateFormat)

  return (
    <Collapse in={open} timeout="auto" unmountOnExit sx={{ width: '100%' }}>
      <Grid container alignItems="center" justifyContent="center">
        &nbsp;{t('last_seen')}:<br />{dateFormatter.format(new Date(updated * 1000))}
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
  is_battle_available,
  battle_pokemon_id,
  battle_pokemon_form,
  battle_pokemon_alignment,
  battle_pokemon_costume,
  battle_pokemon_gender,
  battle_pokemon_bread_mode,
  battle_pokemon_move_1,
  battle_pokemon_move_2,
  battle_end,
  start_time,
  end_time,
}) {
  const { t } = useTranslateById()
  const stationImage = useMemory((s) => s.Icons.getStation(start_time < Date.now() / 1000))
  const battle_end_time = ((battle_end == end_time) && (battle_end > Date.now() / 1000 + 60 * 60)) ? battle_end - 60 * 60 * 8 : battle_end
  const types = useMemory((s) => {
    if (!battle_pokemon_id) return []
    const poke = s.masterfile.pokemon[battle_pokemon_id]
    if (poke?.forms?.[battle_pokemon_form]?.types) {
      return poke.forms[battle_pokemon_form]?.types || []
    }
    return poke?.types || []
  })

  return battle_end_time > Date.now() / 1000 ? (
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
          {!!battle_pokemon_costume && (
            <Box textAlign="center">
              <Typography variant="caption">
                &nbsp;({t(`costume_${battle_pokemon_costume}`)})
              </Typography>
            </Box>
          )}
        </Stack>
        <Stack alignItems="center" justifyContent="center" spacing={0.5}>
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
          {battle_pokemon_move_1 && <PokeMove id={battle_pokemon_move_1} />}
          {battle_pokemon_move_2 && <PokeMove id={battle_pokemon_move_2} />}
        </Stack>
      </Box>
    </CardMedia>
  ) : (
    <Box width="100%" className="flex-center">
      <CardMedia
        component="img"
        src={stationImage}
        sx={{ maxWidth: 75, maxHeight: 75 }}
      />
    </Box>
  )
}

/** @param {import('@rm/types').Station} station */
function StationAttackBonus({ total_stationed_pokemon }) {
  const { t } = useTranslation()
  return (
    <Stack alignItems="center">
      <Rating
        value={getStationAttackBonus(total_stationed_pokemon)}
        readOnly
        icon={<LockOpenIcon fontSize="inherit" />}
        emptyIcon={<LockIcon fontSize="inherit" />}
        max={4}
      />
      <Typography variant="caption">
        {t('battle_bonus')} &nbsp;({total_stationed_pokemon} / 40)
      </Typography>
    </Stack>
  )
}

/** @param {import('@rm/types').Station} station */
function StationContent({ start_time, end_time, id }) {
  const epoch = (start_time > Date.now() / 1000 ? start_time : end_time) || 0
  return (
    <CardContent sx={{ p: 0 }}>
      <Stack alignItems="center" justifyContent="center">
        {start_time > Date.now() / 1000 ? (
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
function StationMons({ id }) {
  const { t: tId } = useTranslateById()
  const { t } = useTranslation()
  const mons = useGetStationMons(id)
  const icons = useMemory((s) => s.Icons)

  return (
    <CardContent sx={{ my: 1, p: 0, height: 130 }}>
      <Typography variant="h6" align="center">
        {t('placed_pokemon')}
      </Typography>
      <VirtualGrid data={mons} xs={6}>
        {(index, mon) => {
          const caption = tId(`${mon.pokemon_id}-${mon.form}`)
          return (
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="space-between"
              p={1}
              height="100%"
            >
              <Img
                key={index}
                src={icons.getPokemon(
                  mon.pokemon_id,
                  mon.form,
                  0,
                  mon.gender,
                  mon.costume,
                  0,
                  false,
                  mon.bread_mode,
                )}
                alt={caption}
                maxHeight="100%"
                maxWidth={50}
              />
              <Typography variant="caption">{caption}</Typography>
            </Box>
          )
        }}
      </VirtualGrid>
    </CardContent>
  )
}

/**
 * @param {{ start?: boolean, epoch: number } & import('@mui/material').TypographyProps} props
 */
function LiveTimeStamp({ start = false, epoch, ...props }) {
  const { t } = useTranslation()
  const relativeTime = useRelativeTimer(epoch || 0)
  const pastTense = epoch * 1000 < Date.now()

  return (
    <Typography variant="subtitle2" {...props}>
      {start
        ? t(pastTense ? 'started' : 'starts')
        : t(pastTense ? 'ended' : 'ends')}
      &nbsp;
      {relativeTime}
    </Typography>
  )
}

/**
 * @param {{ start?: boolean, epoch: number } & import('@mui/material').TypographyProps} props
 */
function StationTimeStamp({ start = false, epoch, ...props }) {
  const { t } = useTranslation()
  const relativeTime = useRelativeTimer(epoch || 0)
  const pastTense = epoch * 1000 < Date.now()

  return (
    <Typography variant="subtitle2" {...props}>
      {start
        ? t('active')
        : t('inactive')}
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

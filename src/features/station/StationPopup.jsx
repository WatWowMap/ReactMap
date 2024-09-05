/* eslint-disable react/destructuring-assignment */
// @ts-check
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import Card from '@mui/material/Card'
import CardMedia from '@mui/material/CardMedia'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import CardHeader from '@mui/material/CardHeader'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Rating from '@mui/material/Rating'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Box from '@mui/material/Box'

import { useMemory } from '@store/useMemory'
import { setDeepStore, useStorage } from '@store/useStorage'
import { Navigation } from '@components/popups/Navigation'
import { useTranslateById } from '@hooks/useTranslateById'
import { PokeType } from '@components/popups/PokeType'
import { GenderIcon } from '@components/popups/GenderIcon'
import { Img } from '@components/Img'
import { useFormatStore } from '@store/useFormatStore'
import { useRelativeTimer } from '@hooks/useRelativeTime'
import { useAnalytics } from '@hooks/useAnalytics'
import { Title } from '@components/popups/Title'
import { VisibleToggle } from '@components/inputs/VisibleToggle'

/**
 *
 * @param {import('@rm/types').Station} station
 * @returns
 */
export function StationPopup(station) {
  useAnalytics('Popup', 'Station')

  return (
    <Card sx={{ width: 200 }} elevation={0}>
      <StationHeader {...station} />
      <StationMedia {...station} />
      <StationContent {...station} />
      <Box
        component={CardActions}
        display="flex"
        alignItems="center"
        justifyContent="space-evenly"
      >
        <Navigation lat={station.lat} lon={station.lon} />
        <StationMenu {...station} />
      </Box>
    </Card>
  )
}

/**
 *
 * @param {import('@rm/types').Station} station
 * @returns
 */
function StationHeader({ name, updated }) {
  const { t } = useTranslation()
  const dateFormatter = useFormatStore((s) => s.dateFormat)

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
      subheader={
        <Typography variant="caption">
          {dateFormatter.format(new Date(updated * 1000))}
        </Typography>
      }
      sx={{ p: 0 }}
    />
  )
}

function StationMenu({
  id,
  battle_level,
  battle_pokemon_id,
  battle_pokemon_form,
}) {
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
      </Menu>
    </>
  )
}
/**
 *
 * @param {import('@rm/types').Station} station
 * @returns
 */
function StationMedia({
  battle_pokemon_id,
  battle_pokemon_form,
  battle_pokemon_alignment,
  battle_pokemon_costume,
  battle_pokemon_gender,
}) {
  const { t } = useTranslateById()
  const monImage = useMemory((s) =>
    s.Icons.getPokemon(
      battle_pokemon_id,
      battle_pokemon_form,
      0,
      battle_pokemon_gender,
      battle_pokemon_costume,
      battle_pokemon_alignment,
    ),
  )
  const stationImage = useMemory((s) => s.Icons.getStation(true))
  const pokemon = useMemory((s) => {
    if (!battle_pokemon_id) return null
    const poke = s.masterfile.pokemon[battle_pokemon_id]
    if (poke?.forms?.[battle_pokemon_form]) {
      return poke.forms[battle_pokemon_form]
    }
    return poke
  })

  return battle_pokemon_id ? (
    <CardMedia>
      <Box className="popup-card-media">
        <Box className="flex-center">
          <Img
            src={monImage}
            alt={t(`${battle_pokemon_id}-${battle_pokemon_form}`)}
            maxHeight={100}
            maxWidth="100%"
          />
        </Box>
        <Stack alignItems="center" justifyContent="center" spacing={2}>
          {pokemon?.types?.map((type) => (
            <PokeType key={type} id={type} size="medium" />
          ))}
          <GenderIcon gender={battle_pokemon_gender} fontSize="medium" />
        </Stack>
      </Box>
    </CardMedia>
  ) : (
    <Box width="100%" className="flex-center">
      <CardMedia
        component="img"
        src={stationImage}
        sx={{ maxWidth: 100, maxHeight: 100 }}
      />
    </Box>
  )
}

/**
 *
 * @param {import('@rm/types').Station} station
 * @returns
 */
function StationContent({
  battle_pokemon_id,
  battle_pokemon_form,
  battle_pokemon_costume,
  battle_level,
  start_time,
  end_time,
  id,
}) {
  const { t } = useTranslation()
  return (
    <CardContent sx={{ p: 0 }}>
      <Stack alignItems="center" justifyContent="center" spacing={1}>
        {!!battle_level && (
          <Rating value={battle_level} max={Math.max(5, battle_level)} />
        )}
        {!!battle_pokemon_id && (
          <Box textAlign="center">
            <Typography variant="h6">
              {t(`poke_${battle_pokemon_id}`)}
            </Typography>
            {!!battle_pokemon_form && (
              <Typography variant="subtitle2">
                {t(`form_${battle_pokemon_form}`)}
              </Typography>
            )}
            {!!battle_pokemon_costume && (
              <Typography variant="subtitle2">
                {t(`costume_${battle_pokemon_costume}`)}
              </Typography>
            )}
          </Box>
        )}
        {start_time > Date.now() / 1000 ? (
          <TimeStamp start date epoch={start_time || 0} id={id} />
        ) : (
          <TimeStamp date epoch={end_time || 0} id={id} />
        )}
      </Stack>
    </CardContent>
  )
}

/**
 *
 * @param {{ start?: boolean, date?: boolean, epoch: number, id: string }} props
 * @returns
 */
function TimeStamp({ start = false, date = false, epoch, id }) {
  const { t } = useTranslation()
  const formatter = useFormatStore((s) => (date ? s.dateFormat : s.timeFormat))
  const relativeTime = useRelativeTimer(epoch || 0)
  const pastTense = epoch * 1000 < Date.now()
  const timerIsAlwaysVisible = useStorage(
    (s) => s.userSettings.stations.battleTimers,
  )
  const timerAlreadyVisible = useMemory((s) => s.timerList.includes(id))

  return (
    <Stack justifyContent="space-evenly" direction="row" width="100%">
      <VisibleToggle
        visible={timerIsAlwaysVisible || timerAlreadyVisible}
        disabled={timerIsAlwaysVisible}
        onClick={() =>
          useMemory.setState((prev) => {
            if (prev.timerList.includes(id)) {
              return { timerList: prev.timerList.filter((x) => x !== id) }
            }
            return { timerList: [...prev.timerList, id] }
          })
        }
      />
      <Stack alignItems="center" justifyContent="center">
        <Typography variant="subtitle2">
          {start
            ? t(pastTense ? 'started' : 'starts')
            : t(pastTense ? 'ended' : 'ends')}
          &nbsp;
          {relativeTime}
        </Typography>
        <Typography variant="caption">
          {formatter.format(new Date(epoch * 1000))}
        </Typography>
      </Stack>
    </Stack>
  )
}

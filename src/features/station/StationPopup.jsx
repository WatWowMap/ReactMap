/* eslint-disable react/destructuring-assignment */
// @ts-check
import * as React from 'react'
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

import { useTranslation } from 'react-i18next'
import { useMemory } from '@store/useMemory'
import { setDeepStore } from '@store/useStorage'
import { Navigation } from '@components/popups/Navigation'
import { useTranslateById } from '@hooks/useTranslateById'
import { PokeType } from '@components/popups/PokeType'
import { GenderIcon } from '@components/popups/GenderIcon'
import { Img } from '@components/Img'
import { useFormatStore } from '@store/useFormatStore'
import { useRelativeTimer } from '@hooks/useRelativeTime'
import { useAnalytics } from '@hooks/useAnalytics'
import { Title } from '@components/popups/Title'

/**
 *
 * @param {import('@rm/types').Station} station
 * @returns
 */
export function StationPopup(station) {
  useAnalytics('Popup', 'Station')

  return (
    <Card sx={{ width: 200 }}>
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
      </Box>
    </Card>
  )
}

/**
 *
 * @param {import('@rm/types').Station} station
 * @returns
 */
function StationHeader({
  id,
  name,
  updated,
  battle_level,
  battle_pokemon_id,
  battle_pokemon_form,
}) {
  const [anchorEl, setAnchorEl] = React.useState(null)
  const { t } = useTranslation()
  const dateFormatter = useFormatStore((s) => s.dateFormat)

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
      <CardHeader
        action={
          <IconButton aria-label="actions" onClick={handleClick}>
            <MoreVertIcon />
          </IconButton>
        }
        title={
          <Box overflow="none" width={130}>
            <Title backup={t('unknown_station')}>{name}</Title>
          </Box>
        }
        subheader={
          <Typography variant="caption">
            {dateFormatter.format(new Date(updated * 1000))}
          </Typography>
        }
      />
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
  const pokemon = useMemory((s) => {
    if (!battle_pokemon_id) return null
    const poke = s.masterfile.pokemon[battle_pokemon_id]
    if (poke?.forms?.[battle_pokemon_form]) {
      return poke.forms[battle_pokemon_form]
    }
    return poke
  })

  if (!battle_pokemon_id) return null
  return (
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
  is_battle_available,
}) {
  const { t } = useTranslation()
  if (!battle_pokemon_id) return null
  return (
    <CardContent>
      <Stack alignItems="center" justifyContent="center" spacing={1}>
        <Rating value={battle_level} max={Math.max(5, battle_level)} />
        <Box textAlign="center">
          <Typography variant="h6">{t(`poke_${battle_pokemon_id}`)}</Typography>
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
        <TimeStamp
          start={!is_battle_available}
          epoch={is_battle_available ? end_time : start_time}
        />
      </Stack>
    </CardContent>
  )
}

/**
 *
 * @param {{ start?: boolean, date?: boolean, epoch: number }} props
 * @returns
 */
function TimeStamp({ start = false, date = false, epoch }) {
  const { t } = useTranslation()
  const formatter = useFormatStore((s) => (date ? s.dateFormat : s.timeFormat))
  const relativeTime = useRelativeTimer(epoch || 0)

  return (
    <Stack alignItems="center" justifyContent="space-around">
      <Typography variant="h6">
        {start ? t('starts') : t('ends')}:&nbsp;
        {relativeTime}
      </Typography>
      <Typography variant="subtitle1">
        {formatter.format(new Date(epoch * 1000))}
      </Typography>
    </Stack>
  )
}

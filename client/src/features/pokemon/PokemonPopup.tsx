import * as React from 'react'
import ExpandMore from '@mui/icons-material/ExpandMore'
import MoreVert from '@mui/icons-material/MoreVert'
import Grid from '@mui/material/Unstable_Grid2'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import Avatar from '@mui/material/Avatar'
import Tooltip from '@mui/material/Tooltip'
import Collapse from '@mui/material/Collapse'
import { useTranslation } from 'react-i18next'
import { useMemory } from '@store/useMemory'
import { setDeepStore, useStorage } from '@store/useStorage'
import { ErrorBoundary } from '@components/ErrorBoundary'
import { TextWithIcon } from '@components/Img'
import { NameTT } from '@components/popups/NameTT'
import { GenderIcon } from '@components/popups/GenderIcon'
import { Navigation } from '@components/popups/Navigation'
import { Coords } from '@components/popups/Coords'
import { TimeStamp } from '@components/popups/TimeStamps'
import { ExtraInfo } from '@components/popups/ExtraInfo'
import { useAnalytics } from '@hooks/useAnalytics'
import { getTimeUntil } from '@utils/getTimeUntil'
import { StatusIcon } from '@components/StatusIcon'
import { Pokemon } from '@rm/types'

const rowClass = { width: 30, fontWeight: 'bold' }

const leagueLookup = {
  great: '1500',
  ultra: '2500',
  master: '9000',
} as const

const getColor = (ivPercent: number) => {
  switch (true) {
    case ivPercent < 51:
      return 'error.dark'
    case ivPercent < 66:
      return 'error.light'
    case ivPercent < 82:
      return 'warning.main'
    case ivPercent < 100:
      return 'info.main'
    case ivPercent === 100:
      return 'success.main'
    default:
      return 'text.primary'
  }
}

export function PokemonPopup({
  pokemon,
  iconUrl,
  isTutorial = false,
}: {
  pokemon: import('@rm/types').Pokemon
  iconUrl: string
  isTutorial?: boolean
}) {
  const { t } = useTranslation()
  const { cleanPvp, iv, cp } = pokemon
  const ivPerm = useMemory((s) => s.auth?.perms?.iv || isTutorial)
  const pvpPerm = useMemory((s) => s.auth?.perms?.pvp || isTutorial)

  const pvpPopup = useStorage((s) => s.popups.pvp)
  const extraPopup = useStorage((s) => s.popups.extras)

  const hasLeagues = cleanPvp ? Object.keys(cleanPvp) : []
  const hasStats = !!(iv || cp)

  useAnalytics(
    'Popup',
    `ID: ${pokemon.pokemon_id} IV: ${pokemon.iv}% PVP: #${pokemon.bestPvp}`,
    'Pokemon',
  )

  return (
    <ErrorBoundary noRefresh style={{}} variant="h5">
      <Grid
        container
        alignItems="center"
        justifyContent="center"
        spacing={1}
        style={{ width: 200 }}
      >
        <Header iconUrl={iconUrl} isTutorial={isTutorial} pokemon={pokemon} />
        {pokemon.seen_type !== 'encounter' && (
          <Grid textAlign="center" xs={12}>
            <Typography variant="caption">
              {t(`seen_${pokemon.seen_type}`, '')}
            </Typography>
          </Grid>
        )}
        {pokemon.seen_type === 'nearby_cell' && (
          <Typography>{t('pokemon_cell')}</Typography>
        )}
        {!!pokemon.expire_timestamp && (
          <Timer hasStats={hasStats} pokemon={pokemon} />
        )}
        {hasStats && ivPerm && (
          <>
            <Stats pokemon={pokemon} />
            <Divider flexItem orientation="vertical" />
          </>
        )}
        <Info isTutorial={isTutorial} pokemon={pokemon} />
        <Footer hasPvp={!!hasLeagues.length} pokemon={pokemon} />
        <Collapse unmountOnExit in={pvpPopup && pvpPerm} timeout="auto">
          {hasLeagues.map((league) => (
            <PvpInfo key={league} league={league} pokemon={pokemon} />
          ))}
        </Collapse>
        <Collapse unmountOnExit in={extraPopup} timeout="auto">
          <ExtraPokemonInfo isTutorial={isTutorial} pokemon={pokemon} />
        </Collapse>
      </Grid>
    </ErrorBoundary>
  )
}

const Header = ({
  pokemon,
  iconUrl,
  isTutorial,
}: {
  pokemon: import('@rm/types').Pokemon
  iconUrl: string
  isTutorial: boolean
}) => {
  const { t } = useTranslation()
  const filters = useStorage((s) => s.filters)
  const metaData = useMemory((s) => s.masterfile.pokemon[pokemon.pokemon_id])
  const userSettings = useStorage((s) => s.userSettings.pokemon)

  const [anchorEl, setAnchorEl] = React.useState(null)
  const { id, pokemon_id, form, ditto_form, display_pokemon_id } = pokemon

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleHide = () => {
    setAnchorEl(null)
    useMemory.setState((prev) => ({ hideList: new Set(prev.hideList).add(id) }))
  }

  const handleExclude = () => {
    setAnchorEl(null)
    if (filters?.pokemon?.filter) {
      const key = `${pokemon_id}-${form}`

      setDeepStore(`filters.pokemon.filter.${key}.enabled`, false)
    }
  }

  const handleTimer = () => {
    setAnchorEl(null)
    useMemory.setState((prev) => {
      if (prev.timerList.includes(id)) {
        return { timerList: prev.timerList.filter((x) => x !== id) }
      }

      return { timerList: [...prev.timerList, id] }
    })
  }

  const options = [
    { name: 'timer', action: handleTimer },
    { name: 'hide', action: handleHide },
  ]

  if (
    isTutorial ||
    filters?.pokemon?.filter?.[`${pokemon_id}-${form}`]?.enabled
  ) {
    options.push({ name: 'exclude', action: handleExclude })
  }
  const pokeName = t(`poke_${metaData.pokedexId}`)
  const formName =
    metaData.forms?.[form]?.name === 'Normal' || form === 0
      ? ''
      : t(`form_${pokemon.form}`)

  return (
    <>
      <Grid xs={3}>
        {userSettings.showDexNumInPopup ? (
          <Avatar>{metaData.pokedexId}</Avatar>
        ) : (
          <img
            alt={t(`poke_${display_pokemon_id}`)}
            src={iconUrl}
            style={{ maxWidth: 40, maxHeight: 40 }}
          />
        )}
      </Grid>
      <Grid textAlign="center" xs={6}>
        <Typography variant={pokeName.length > 8 ? 'h6' : 'h5'}>
          {pokeName}
        </Typography>
        {ditto_form !== null && display_pokemon_id ? (
          <Typography variant="caption">
            ({t(`poke_${display_pokemon_id}`)})
          </Typography>
        ) : (
          <Typography variant="caption">{formName}</Typography>
        )}
      </Grid>
      <Grid xs={3}>
        <IconButton aria-haspopup="true" size="large" onClick={handleClick}>
          <MoreVert />
        </IconButton>
      </Grid>
      <Menu
        keepMounted
        PaperProps={{
          style: {
            maxHeight: 216,
            minWidth: '20ch',
          },
        }}
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={handleClose}
      >
        {options.map((option) => (
          <MenuItem key={option.name} onClick={option.action}>
            {typeof option.name === 'string' ? t(option.name) : option.name}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}

const Stats = ({ pokemon }: { pokemon: Pokemon }) => {
  const { t } = useTranslation()
  const { cp, iv, atk_iv, def_iv, sta_iv, level, inactive_stats } = pokemon

  return (
    <Grid
      container
      alignItems="center"
      direction="column"
      justifyContent="space-around"
      xs={8}
    >
      {iv !== null && (
        <Grid>
          <Typography align="center" color={getColor(iv)} variant="h5">
            {iv.toFixed(2)}
            {t('%')}
          </Typography>
        </Grid>
      )}
      {atk_iv !== null && (
        <Grid>
          <Typography align="center" variant="subtitle1">
            {atk_iv} | {def_iv} | {sta_iv} {inactive_stats ? '*' : ''}
          </Typography>
        </Grid>
      )}
      {level !== null && (
        <Grid>
          <Typography align="center" variant="subtitle1">
            {t('cp')} {cp} | {t('abbreviation_level')}
            {level}
          </Typography>
        </Grid>
      )}
    </Grid>
  )
}

const Info = ({
  pokemon,
  isTutorial,
}: {
  pokemon: Pokemon
  isTutorial: boolean
}) => {
  const { t } = useTranslation()
  const Icons = useMemory((s) => s.Icons)
  const timeOfDay = useMemory((s) => s.timeOfDay)
  const metaData = useMemory((s) => s.masterfile.pokemon[pokemon.pokemon_id])
  const darkMode = useStorage((s) => s.darkMode)
  const ivPerm = useMemory((s) => s.auth?.perms?.iv || isTutorial)

  const { gender, size, weather, form } = pokemon
  const formTypes = metaData?.forms?.[form]?.types || metaData?.types || []

  return (
    <Grid
      container
      alignItems="center"
      direction={ivPerm ? 'column' : 'row'}
      justifyContent="space-around"
      xs={ivPerm ? 3 : 11}
    >
      {weather != 0 && ivPerm && (
        <Grid
          className={`grid-item ${darkMode ? '' : 'darken-image'}`}
          style={{
            height: 24,
            width: 24,
            backgroundImage: `url(${Icons.getWeather(weather, timeOfDay)})`,
          }}
        />
      )}
      {!!gender && (
        <Grid textAlign="center">
          <GenderIcon gender={gender} />
        </Grid>
      )}
      {!!size && Number.isInteger(size) && (
        <Grid
          style={{
            height: 24,
            width: 24,
            textAlign: 'center',
          }}
        >
          <Typography variant="caption">{t(`size_${size}`)}</Typography>
        </Grid>
      )}

      {formTypes.map((type) => (
        <Grid
          key={type}
          className="grid-item"
          style={{
            height: 20,
            width: 20,
            marginBottom: 5,
            backgroundImage: `url(${Icons.getTypes(type)})`,
          }}
        />
      ))}
    </Grid>
  )
}

const Timer = ({
  pokemon,
  hasStats,
}: {
  pokemon: Pokemon
  hasStats: boolean
}) => {
  const { t } = useTranslation()
  const { expire_timestamp, expire_timestamp_verified } = pokemon
  const despawnTimer = expire_timestamp * 1000
  const [timer, setTimer] = React.useState(getTimeUntil(despawnTimer, true))

  React.useEffect(() => {
    const timer2 = setTimeout(() => {
      setTimer(getTimeUntil(despawnTimer, true))
    }, 1000)

    return () => clearTimeout(timer2)
  })

  return (
    <>
      <Grid xs={hasStats ? 9 : 6}>
        <Typography align="center" variant="h6">
          {timer.str}
        </Typography>
        <Typography align="center" variant="subtitle2">
          {new Date(despawnTimer).toLocaleTimeString(
            localStorage.getItem('i18nextLng') || 'en',
          )}
        </Typography>
      </Grid>
      <Grid xs={hasStats ? 3 : 2}>
        <Tooltip
          arrow
          enterTouchDelay={0}
          title={
            expire_timestamp_verified
              ? t('timer_verified')
              : t('timer_unverified')
          }
        >
          <StatusIcon status={expire_timestamp_verified} />
        </Tooltip>
      </Grid>
    </>
  )
}

const Footer = ({ pokemon, hasPvp }: { pokemon: Pokemon; hasPvp: boolean }) => {
  const { lat, lon } = pokemon
  const darkMode = useStorage((s) => s.darkMode)
  const Icons = useMemory((s) => s.Icons)
  const pvpPopup = useStorage((s) => s.popups.pvp)
  const extraPopup = useStorage((s) => s.popups.extras)

  const handleExpandClick = (category: string) => {
    const opposite = category === 'extras' ? 'pvp' : 'extras'

    useStorage.setState((prev) => ({
      popups: {
        ...prev.popups,
        [category]: !prev[category],
        [opposite]: false,
      },
    }))
  }

  return (
    <>
      {hasPvp && (
        <Grid xs={4}>
          <IconButton
            className={pvpPopup ? 'expanded' : 'closed'}
            name="pvp"
            size="large"
            onClick={() => handleExpandClick('pvp')}
          >
            <img
              alt="pvp"
              className={darkMode ? '' : 'darken-image'}
              height={20}
              src={Icons.getMisc('pvp')}
              width="auto"
            />
          </IconButton>
        </Grid>
      )}
      <Grid textAlign="center" xs={4}>
        <Navigation lat={lat} lon={lon} />
      </Grid>
      <Grid xs={4}>
        <IconButton
          className={extraPopup ? 'expanded' : 'closed'}
          size="large"
          onClick={() => handleExpandClick('extras')}
        >
          <ExpandMore />
        </IconButton>
      </Grid>
    </>
  )
}

const ExtraPokemonInfo = ({
  pokemon,
  isTutorial,
}: {
  pokemon: Pokemon
  isTutorial: boolean
}) => {
  const moves = useMemory((s) => s.masterfile.moves)
  const Icons = useMemory((s) => s.Icons)
  const { t } = useTranslation()
  const userSettings = useStorage((s) => s.userSettings.pokemon)
  const ivPerm = useMemory((s) => s.auth?.perms?.iv || isTutorial)

  const { move_1, move_2, first_seen_timestamp, updated, iv } = pokemon

  return (
    <Grid container alignItems="center" justifyContent="center">
      {ivPerm &&
        iv !== null &&
        [move_1, move_2].map((move, i) => {
          if (!move) return null

          return (
            <ExtraInfo key={move} title={i ? 'charged' : 'fast'}>
              <TextWithIcon src={Icons.getTypes(moves[move].type)}>
                {t(`move_${move}`)}
              </TextWithIcon>
            </ExtraInfo>
          )
        })}
      <Divider
        flexItem
        style={{ width: '100%', height: 2, margin: '10px 0' }}
      />
      <TimeStamp time={first_seen_timestamp}>first_seen</TimeStamp>
      <TimeStamp time={updated}>last_seen</TimeStamp>

      {process.env.NODE_ENV === 'development' && (
        <Grid style={{ paddingTop: 10 }} xs={12}>
          <Typography align="center" variant="subtitle1">
            {pokemon.id}
          </Typography>
        </Grid>
      )}
      {userSettings.enablePokemonPopupCoords && (
        <Grid textAlign="center" xs={12}>
          <Coords lat={pokemon.lat.toFixed(6)} lon={pokemon.lon.toFixed(6)} />
        </Grid>
      )}
    </Grid>
  )
}

const PvpInfo = ({ pokemon, league }: { pokemon: Pokemon; league: string }) => {
  const { t } = useTranslation()
  const Icons = useMemory((s) => s.Icons)

  const rows = React.useMemo(
    () =>
      pokemon.cleanPvp[league]
        ?.map((each) =>
          each.rank !== null && each.cp !== null
            ? {
                id: `${league}-${each.pokemon}-${each.form}-${each.evolution}-${each.rank}-${each.cp}-${each.level}-${each.cap}`,
                img: (
                  <NameTT
                    title={[
                      each.evolution
                        ? `evo_${each.evolution}`
                        : each.form
                          ? `form_${each.form}`
                          : '',
                      `poke_${each.pokemon}`,
                    ]}
                  >
                    <img
                      alt={t(`poke_${each.pokemon}`)}
                      src={Icons.getPokemon(
                        each.pokemon,
                        each.form,
                        each.evolution,
                        0,
                        pokemon.costume,
                      )}
                      style={{ maxWidth: 40, maxHeight: 20 }}
                    />
                  </NameTT>
                ),
                rank: each.rank || 0,
                cp: each.cp || 0,
                lvl: `${each.level || ''}${
                  each.cap && !each.capped ? `/${each.cap}` : ''
                }`,
                percent: (each.percentage * 100).toFixed(1) || 0,
              }
            : null,
        )
        .filter(Boolean),
    [pokemon, league],
  )

  return (
    <table className="table-pvp">
      <thead>
        <tr>
          <td style={rowClass}>
            <img
              alt={league}
              height={20}
              src={Icons.getMisc(leagueLookup[league] || '500')}
            />
          </td>
          <td style={rowClass}>{t('rank')}</td>
          <td style={rowClass}>{t('cp')}</td>
          <td style={rowClass}>{t('lvl')}</td>
          <td style={rowClass}>{t('%')}</td>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td> {row.img}</td>
            <td>{row.rank}</td>
            <td>{row.cp}</td>
            <td>{row.lvl}</td>
            <td>{row.percent}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

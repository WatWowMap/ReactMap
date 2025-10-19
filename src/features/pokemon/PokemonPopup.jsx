// @ts-check
import * as React from 'react'
import { useLazyQuery } from '@apollo/client'
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
import { useTranslation, Trans } from 'react-i18next'

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
import { readableProbability } from '@utils/readableProbability'
import { GET_POKEMON_SHINY_STATS } from '@services/queries/pokemon'
import { GET_TAPPABLE_BY_ID } from '@services/queries/tappable'

const rowClass = { width: 30, fontWeight: 'bold' }

const leagueLookup = {
  great: '1500',
  ultra: '2500',
  master: '9000',
}

const TAPPABLE_SEEN_TYPES = new Set([
  'tappable_encounter',
  'tappable_lure_encounter',
])

const formatTappableType = (type, t, i18n) => {
  if (!type) return ''
  const cleaned = type
    .replace(/^TAPPABLE_TYPE_/, '')
    .toLowerCase()
    .replace(/_/g, ' ')
  const translationKey = `tappable_type_${cleaned.replace(/\s+/g, '_')}`
  if (i18n?.exists?.(translationKey)) {
    return t(translationKey)
  }
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/** @param {number} ivPercent */
const getColor = (ivPercent) => {
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

export function PokemonPopup({ pokemon, iconUrl, isTutorial = false }) {
  const { t, i18n } = useTranslation()
  const { pokemon_id, cleanPvp, iv, cp } = pokemon
  const perms = useMemory((s) => s.auth.perms)
  const timeOfDay = useMemory((s) => s.timeOfDay)
  const metaData = useMemory((s) => s.masterfile.pokemon[pokemon_id])
  const Icons = useMemory((s) => s.Icons)

  const userSettings = useStorage((s) => s.userSettings.pokemon)
  const pokePerms = isTutorial
    ? {
        pvp: true,
        iv: true,
      }
    : perms
  const popups = useStorage((s) => s.popups)

  const hasLeagues = cleanPvp ? Object.keys(cleanPvp) : []
  const hasStats = iv || cp

  const supportsShinyStats = useMemory((s) => s.featureFlags.supportsShinyStats)
  const shinyKey = React.useMemo(
    () => `${pokemon.pokemon_id}-${pokemon.form ?? 0}`,
    [pokemon.pokemon_id, pokemon.form],
  )
  const [shinyStats, setShinyStats] = React.useState(null)
  const pendingShinyKey = React.useRef(null)
  const [loadShinyStats] = useLazyQuery(GET_POKEMON_SHINY_STATS)
  const canQueryTappable = !isTutorial && !!perms?.tappables
  const showTappableSource = React.useMemo(
    () => canQueryTappable && TAPPABLE_SEEN_TYPES.has(pokemon.seen_type),
    [canQueryTappable, pokemon.seen_type],
  )
  const [tappableSource, setTappableSource] = React.useState(null)
  const tappableRequestToken = React.useRef(0)
  const [loadTappableSource, { loading: tappableLoading }] = useLazyQuery(
    GET_TAPPABLE_BY_ID,
    {
      fetchPolicy: 'cache-first',
    },
  )

  React.useEffect(() => {
    setShinyStats(null)
    pendingShinyKey.current = null
  }, [shinyKey])

  React.useEffect(() => {
    if (!supportsShinyStats) {
      setShinyStats(null)
      pendingShinyKey.current = null
    }
  }, [supportsShinyStats])

  React.useEffect(() => {
    setTappableSource(null)
    tappableRequestToken.current += 1
  }, [pokemon.id])

  React.useEffect(() => {
    if (!showTappableSource) {
      setTappableSource(null)
      tappableRequestToken.current += 1
    }
  }, [showTappableSource])

  React.useEffect(() => {
    if (!supportsShinyStats) {
      pendingShinyKey.current = null
      return
    }
    if (shinyStats || !pokemon.pokemon_id) {
      return
    }
    if (pendingShinyKey.current === shinyKey) {
      return
    }
    let isActive = true
    pendingShinyKey.current = shinyKey
    loadShinyStats({
      variables: {
        pokemonId: pokemon.pokemon_id,
        form: pokemon.form ?? 0,
      },
      fetchPolicy: 'cache-first',
    })
      .then(({ data }) => {
        if (!isActive || pendingShinyKey.current !== shinyKey) {
          return
        }
        if (data?.pokemonShinyStats) {
          setShinyStats(data.pokemonShinyStats)
        }
      })
      .catch(() => {
        if (isActive && pendingShinyKey.current === shinyKey) {
          pendingShinyKey.current = null
        }
      })
    return () => {
      isActive = false
    }
  }, [supportsShinyStats, shinyStats, shinyKey, loadShinyStats])

  React.useEffect(() => {
    if (!showTappableSource || !canQueryTappable || !pokemon.id) {
      return
    }
    const tappableId = pokemon.id
    tappableRequestToken.current += 1
    const requestToken = tappableRequestToken.current
    loadTappableSource({
      variables: { id: tappableId },
    })
      .then((response) => {
        if (tappableRequestToken.current !== requestToken) {
          return
        }
        setTappableSource(response?.data?.tappableById || null)
      })
      .catch(() => {
        if (tappableRequestToken.current !== requestToken) {
          return
        }
        setTappableSource(null)
      })
    return () => {
      tappableRequestToken.current += 1
    }
  }, [showTappableSource, canQueryTappable, pokemon.id, loadTappableSource])

  useAnalytics(
    'Popup',
    `ID: ${pokemon.pokemon_id} IV: ${pokemon.iv}% PVP: #${pokemon.bestPvp}`,
    'Pokemon',
  )

  return (
    <ErrorBoundary noRefresh style={{}} variant="h5">
      <Grid
        container
        style={{ width: 200 }}
        alignItems="center"
        justifyContent="center"
        spacing={1}
      >
        <Header
          pokemon={pokemon}
          metaData={metaData}
          iconUrl={iconUrl}
          t={t}
          userSettings={userSettings}
          isTutorial={isTutorial}
        />
        {!!pokemon.background && pokemon.seen_type === 'encounter' ? (
          <Grid
            xs={12}
            container
            alignItems="center"
            justifyContent="center"
            spacing={1}
          >
            <Grid xs={8} textAlign="center">
              <Typography
                variant="caption"
                component="div"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                }}
              >
                {t('with_background')}
              </Typography>
            </Grid>
            <Grid xs={4} display="flex" justifyContent="center">
              <img
                src={Icons.getBackgrounds(quest.quest_location_card)}
                style={{ maxWidth: 42, maxHeight: 42 }}
                onError={(e) => {
                  // @ts-ignore
                  e.target.onerror = null
                  // @ts-ignore
                  e.target.src =
                    'https://raw.githubusercontent.com//ReuschelCGN/wwm-uicons/main/background/0.png'
                }}
              />
            </Grid>
          </Grid>
        ) : null}
        {pokemon.seen_type !== 'encounter' && (
          <Grid xs={12} textAlign="center">
            <Typography
              variant="caption"
              component="div"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                flexWrap: 'wrap',
              }}
            >
              <span>{t(`seen_${pokemon.seen_type}`, '')}</span>
              {showTappableSource && (
                <TappableOrigin
                  tappable={tappableSource}
                  Icons={Icons}
                  t={t}
                  i18n={i18n}
                  loading={tappableLoading}
                />
              )}
            </Typography>
          </Grid>
        )}
        {pokemon.seen_type === 'nearby_cell' && (
          <Typography>{t('pokemon_cell')}</Typography>
        )}
        {!!pokemon.expire_timestamp && (
          <Timer pokemon={pokemon} hasStats={hasStats} t={t} />
        )}
        {hasStats && pokePerms.iv && (
          <>
            <Stats pokemon={pokemon} t={t} />
            <Divider orientation="vertical" flexItem />
          </>
        )}
        <Info
          pokemon={pokemon}
          metaData={metaData}
          perms={pokePerms}
          Icons={Icons}
          timeOfDay={timeOfDay}
          t={t}
        />
        <ShinyOdds shinyStats={shinyStats} t={t} />
        <Footer
          pokemon={pokemon}
          popups={popups}
          hasPvp={!!hasLeagues.length}
          Icons={Icons}
        />
        <Collapse in={popups.pvp && perms.pvp} timeout="auto" unmountOnExit>
          {hasLeagues.map((league) => (
            <PvpInfo
              key={league}
              league={league}
              data={cleanPvp[league]}
              t={t}
              Icons={Icons}
              pokemon={pokemon}
            />
          ))}
        </Collapse>
        <Collapse in={popups.extras} timeout="auto" unmountOnExit>
          <ExtraPokemonInfo
            pokemon={pokemon}
            perms={pokePerms}
            userSettings={userSettings}
            t={t}
            Icons={Icons}
          />
        </Collapse>
      </Grid>
    </ErrorBoundary>
  )
}

const Header = ({
  pokemon,
  metaData,
  t,
  iconUrl,
  userSettings,
  isTutorial,
}) => {
  const filters = useStorage((s) => s.filters)

  const [anchorEl, setAnchorEl] = React.useState(null)
  const { id, pokemon_id, form, display_pokemon_id } = pokemon

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
            src={iconUrl}
            style={{ maxWidth: 40, maxHeight: 40 }}
            alt={pokemon.pokemon_id}
          />
        )}
      </Grid>
      <Grid xs={6} textAlign="center">
        <Typography variant={pokeName.length > 8 ? 'h6' : 'h5'}>
          {pokeName}
        </Typography>
        {pokemon_id === 132 && display_pokemon_id ? (
          <Typography variant="caption">
            ({t(`poke_${display_pokemon_id}`)})
          </Typography>
        ) : (
          <Typography variant="caption">{formName}</Typography>
        )}
      </Grid>
      <Grid xs={3}>
        <IconButton aria-haspopup="true" onClick={handleClick} size="large">
          <MoreVert />
        </IconButton>
      </Grid>
      <Menu
        anchorEl={anchorEl}
        keepMounted
        open={!!anchorEl}
        onClose={handleClose}
        PaperProps={{
          style: {
            maxHeight: 216,
            minWidth: '20ch',
          },
        }}
      >
        {options.map((option) => (
          <MenuItem key={option.key || option.name} onClick={option.action}>
            {typeof option.name === 'string' ? t(option.name) : option.name}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}

const Stats = ({ pokemon, t }) => {
  const { cp, iv, atk_iv, def_iv, sta_iv, level, inactive_stats } = pokemon

  return (
    <Grid
      xs={8}
      container
      direction="column"
      justifyContent="space-around"
      alignItems="center"
    >
      {iv !== null && (
        <Grid>
          <Typography variant="h5" align="center" color={getColor(iv)}>
            {iv.toFixed(2)}
            {t('%')}
          </Typography>
        </Grid>
      )}
      {atk_iv !== null && (
        <Grid>
          <Typography variant="subtitle1" align="center">
            {atk_iv} | {def_iv} | {sta_iv} {inactive_stats ? '*' : ''}
          </Typography>
        </Grid>
      )}
      {level !== null && (
        <Grid>
          <Typography variant="subtitle1" align="center">
            {t('cp')} {cp} | {t('abbreviation_level')}
            {level}
          </Typography>
        </Grid>
      )}
    </Grid>
  )
}

const ShinyOdds = ({ shinyStats, t }) => {
  if (!shinyStats) {
    return null
  }

  const {
    encounters_seen: encounters,
    shiny_seen: shinySeen,
    since_date: sinceDate,
  } = shinyStats

  const encountersNumber = Number(encounters) || 0
  const shinyNumber = Number(shinySeen) || 0
  const shinyRate = encountersNumber ? shinyNumber / encountersNumber : 0

  if (!encountersNumber) {
    return null
  }

  const rateNode = readableProbability(shinyRate)

  const sampleText = t('shiny_sample', {
    percentage: (shinyRate * 100).toLocaleString(),
    checks: encountersNumber.toLocaleString(),
    shiny: shinyNumber.toLocaleString(),
    date: new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
    }).format(new Date(`${sinceDate}T00:00:00Z`)),
  })

  return (
    <Grid xs={12} textAlign="center">
      <Typography variant="caption">
        <Trans
          i18nKey="shiny_probability"
          components={[
            <Tooltip
              key="rate"
              title={sampleText}
              arrow
              enterTouchDelay={0}
              placement="top"
            >
              <span
                style={{
                  cursor: 'help',
                  textDecoration: 'underline dotted',
                  display: 'inline-block',
                  padding: '4px',
                  margin: '-4px',
                  borderRadius: 4,
                  textAlign: 'center',
                }}
              >
                ~{rateNode}
              </span>
            </Tooltip>,
          ]}
        />
      </Typography>
    </Grid>
  )
}

const TappableOrigin = ({ tappable, Icons, t, i18n, loading }) => {
  if (loading || !tappable) {
    return null
  }

  const formattedType = formatTappableType(tappable.type, t, i18n)
  const tappableIcon =
    Icons && typeof Icons.getTappable === 'function'
      ? Icons.getTappable(tappable.type)
      : ''

  return (
    <>
      <span>{t('tappable_origin_from')}</span>
      {tappableIcon ? (
        <img
          src={tappableIcon}
          alt={formattedType}
          style={{ width: 20, height: 20, objectFit: 'contain' }}
        />
      ) : null}
      <span>{formattedType}</span>
    </>
  )
}

const Info = ({ pokemon, metaData, perms, Icons, timeOfDay, t }) => {
  const { gender, size, weather, form } = pokemon
  const formTypes = metaData?.forms?.[form]?.types || metaData?.types || []
  const darkMode = useStorage((s) => s.darkMode)
  return (
    <Grid
      xs={perms.iv ? 3 : 11}
      container
      direction={perms.iv ? 'column' : 'row'}
      justifyContent="space-around"
      alignItems="center"
    >
      {weather != 0 && perms.iv && (
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

const Timer = ({ pokemon, hasStats, t }) => {
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
        <Typography variant="h6" align="center">
          {timer.str}
        </Typography>
        <Typography variant="subtitle2" align="center">
          {new Date(despawnTimer).toLocaleTimeString(
            localStorage.getItem('i18nextLng') || 'en',
          )}
        </Typography>
      </Grid>
      <Grid xs={hasStats ? 3 : 2}>
        <Tooltip
          title={
            expire_timestamp_verified
              ? t('timer_verified')
              : t('timer_unverified')
          }
          arrow
          enterTouchDelay={0}
        >
          <StatusIcon status={expire_timestamp_verified} />
        </Tooltip>
      </Grid>
    </>
  )
}

const Footer = ({ pokemon, popups, hasPvp, Icons }) => {
  const { lat, lon } = pokemon
  const darkMode = useStorage((s) => s.darkMode)

  const handleExpandClick = (category) => {
    const opposite = category === 'extras' ? 'pvp' : 'extras'
    useStorage.setState((prev) => ({
      popups: {
        ...prev.popups,
        [category]: !popups[category],
        [opposite]: false,
      },
    }))
  }

  return (
    <>
      {hasPvp && (
        <Grid xs={4}>
          <IconButton
            className={popups.pvp ? 'expanded' : 'closed'}
            name="pvp"
            onClick={() => handleExpandClick('pvp')}
            size="large"
          >
            <img
              alt="pvp"
              className={darkMode ? '' : 'darken-image'}
              src={Icons.getMisc('pvp')}
              height={20}
              width="auto"
            />
          </IconButton>
        </Grid>
      )}
      <Grid xs={4} textAlign="center">
        <Navigation lat={lat} lon={lon} />
      </Grid>
      <Grid xs={4}>
        <IconButton
          className={popups.extras ? 'expanded' : 'closed'}
          onClick={() => handleExpandClick('extras')}
          size="large"
        >
          <ExpandMore />
        </IconButton>
      </Grid>
    </>
  )
}

const ExtraPokemonInfo = ({ pokemon, perms, userSettings, t, Icons }) => {
  const moves = useMemory((s) => s.masterfile.moves)

  const { move_1, move_2, first_seen_timestamp, updated, iv } = pokemon

  return (
    <Grid container alignItems="center" justifyContent="center">
      {perms.iv &&
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
        <Grid xs={12} style={{ paddingTop: 10 }}>
          <Typography variant="subtitle1" align="center">
            {pokemon.id}
          </Typography>
        </Grid>
      )}
      {userSettings.enablePokemonPopupCoords && (
        <Grid xs={12} textAlign="center">
          <Coords lat={pokemon.lat.toFixed(6)} lon={pokemon.lon.toFixed(6)} />
        </Grid>
      )}
    </Grid>
  )
}

const PvpInfo = ({ pokemon, league, data, t, Icons }) => {
  if (data === null) return ''

  const rows = data
    .map((each) =>
      each.rank !== null && each.cp !== null
        ? {
            id: `${league}-${each.pokemon}-${each.form}-${each.evolution}-${each.gender}-${each.rank}-${each.cp}-${each.lvl}-${each.cap}`,
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
                  src={Icons.getPokemon(
                    each.pokemon,
                    each.form,
                    each.evolution,
                    each.gender,
                    pokemon.costume,
                  )}
                  style={{ maxWidth: 40, maxHeight: 20 }}
                  alt={t(`poke_${each.pokemon}`)}
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
    .filter(Boolean)

  return (
    <table className="table-pvp">
      <thead>
        <tr>
          <td style={rowClass}>
            <img
              src={Icons.getMisc(leagueLookup[league] || '500')}
              height={20}
              alt={league}
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

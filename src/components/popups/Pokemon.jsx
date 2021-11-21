/* eslint-disable camelcase */
import React, {
  Fragment, useCallback, useState, useEffect,
} from 'react'
import {
  Grid, Avatar, Typography, Icon, Collapse, IconButton, Divider, Menu, MenuItem,
} from '@material-ui/core'
import {
  Check, Clear, ExpandMore, Map, MoreVert,
} from '@material-ui/icons'
import { useTranslation } from 'react-i18next'

import { useStore, useStatic } from '@hooks/useStore'
import useStyles from '@hooks/useStyles'
import Utility from '@services/Utility'

import GenericTimer from './common/Timer'

export default function PokemonPopup({
  pokemon, iconUrl, userSettings, isTutorial, Icons, isNight,
}) {
  const { t } = useTranslation()
  const classes = useStyles()
  const {
    pokemon_id, cleanPvp, iv, cp,
  } = pokemon
  const { perms } = useStatic(state => state.auth)
  const pokePerms = isTutorial ? {
    pvp: true, stats: true, iv: true,
  } : perms
  const { pokemon: { [pokemon_id]: metaData } } = useStatic(state => state.masterfile)
  const popups = useStore(state => state.popups)
  const setPopups = useStore(state => state.setPopups)
  const hasLeagues = cleanPvp ? Object.keys(cleanPvp) : []
  const hasStats = iv || cp

  useEffect(() => {
    Utility.analytics('Popup', `ID: ${pokemon.pokemon_id} IV: ${pokemon.iv}% PVP: #${pokemon.bestPvp}`, 'Pokemon')
  }, [])

  return (
    <Grid
      container
      style={{ minWidth: 200 }}
      alignItems="center"
      justifyContent="center"
      spacing={1}
    >
      <Header
        pokemon={pokemon}
        metaData={metaData}
        iconUrl={iconUrl}
        t={t}
        perms={perms}
        userSettings={userSettings}
        classes={classes}
        isTutorial={isTutorial}
      />
      <Timer
        pokemon={pokemon}
        hasStats={hasStats}
      />
      {hasStats && (
        <>
          <Stats
            pokemon={pokemon}
            metaData={metaData}
            perms={pokePerms}
            t={t}
          />
          <Divider orientation="vertical" flexItem />
        </>
      )}
      <Info
        pokemon={pokemon}
        metaData={metaData}
        perms={pokePerms}
        Icons={Icons}
        isNight={isNight}
      />
      <Footer
        pokemon={pokemon}
        popups={popups}
        setPopups={setPopups}
        hasPvp={hasLeagues.length > 0}
        classes={classes}
        Icons={Icons}
      />
      <Collapse in={popups.pvp && perms.pvp} timeout="auto" unmountOnExit>
        {hasLeagues.map(league => (
          <PvpInfo
            key={league}
            league={league}
            data={cleanPvp[league]}
            t={t}
            Icons={Icons}
          />
        ))}
      </Collapse>
      <Collapse in={popups.extras} timeout="auto" unmountOnExit>
        <ExtraInfo
          pokemon={pokemon}
          perms={pokePerms}
          t={t}
          Icons={Icons}
        />
      </Collapse>
    </Grid>
  )
}

const Header = ({
  pokemon, metaData, t, iconUrl, userSettings, classes,
}) => {
  const hideList = useStatic(state => state.hideList)
  const setHideList = useStatic(state => state.setHideList)
  const excludeList = useStatic(state => state.excludeList)
  const setExcludeList = useStatic(state => state.setExcludeList)
  const timerList = useStatic(state => state.timerList)
  const setTimerList = useStatic(state => state.setTimerList)
  const filters = useStore(state => state.filters)
  const setFilters = useStore(state => state.setFilters)

  const [anchorEl, setAnchorEl] = useState(false)
  const {
    id, pokemon_id, form, ditto_form, display_pokemon_id,
  } = pokemon

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleHide = () => {
    setAnchorEl(null)
    setHideList([...hideList, id])
  }

  const handleExclude = () => {
    setAnchorEl(null)
    const key = `${pokemon_id}-${form}`
    setFilters({
      ...filters,
      pokemon: {
        ...filters.pokemon,
        filter: {
          ...filters.pokemon.filter,
          [key]: {
            ...filters.pokemon.filter[key],
            enabled: false,
          },
        },
      },
    })
    setExcludeList([...excludeList, key])
  }

  const handleTimer = () => {
    setAnchorEl(null)
    if (timerList.includes(id)) {
      setTimerList(timerList.filter(x => x !== id))
    } else {
      setTimerList([...timerList, id])
    }
  }

  const options = [
    { name: 'hide', action: handleHide },
    { name: 'exclude', action: handleExclude },
    { name: 'timer', action: handleTimer },
  ]

  const pokeName = t(`poke_${metaData.pokedexId}`)
  const formName = metaData.forms?.[form]?.name === 'Normal' || form === 0 ? '' : t(`form_${pokemon.form}`)

  return (
    <>
      <Grid item xs={3}>
        {userSettings.showDexNumInPopup
          ? (
            <Avatar classes={{
              colorDefault: classes.avatar,
            }}
            >{metaData.pokedexId}
            </Avatar>
          )
          : <img src={iconUrl} style={{ maxWidth: 40, maxHeight: 40 }} />}
      </Grid>
      <Grid item xs={6} style={{ textAlign: 'center' }}>
        <Typography variant={pokeName.length > 8 ? 'h6' : 'h5'}>
          {pokeName}
        </Typography>
        {(ditto_form !== null && display_pokemon_id) ? (
          <Typography variant="caption">
            ({t(`poke_${display_pokemon_id}`)})
          </Typography>
        ) : (
          <Typography variant="caption">
            {formName}
          </Typography>
        )}
      </Grid>
      <Grid item xs={3}>
        <IconButton
          aria-haspopup="true"
          onClick={handleClick}
        >
          <MoreVert style={{ color: 'white' }} />
        </IconButton>
      </Grid>
      <Menu
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
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

const Stats = ({ pokemon, perms, t }) => {
  const {
    cp, iv, atk_iv, def_iv, sta_iv, level, inactive_stats,
  } = pokemon

  const getColor = useCallback(ivPercent => {
    const ivColors = {
      0: 'red', 66: 'orange', 82: 'yellow', 100: '#00e676',
    }
    let color
    Object.keys(ivColors).forEach(range => (
      ivPercent >= parseInt(range) ? color = ivColors[range] : ''
    ))
    return color
  }, [iv])

  return (
    <Grid
      item
      xs={(perms.iv || perms.stats) ? 8 : 1}
      container
      direction="column"
      justifyContent="space-around"
      alignItems="center"
    >
      {(perms.iv && iv !== null) && (
        <Grid item>
          <Typography variant="h5" align="center" style={{ color: getColor(iv) }}>
            {iv.toFixed(2)}{t('%')}
          </Typography>
        </Grid>
      )}
      {(perms.stats && atk_iv !== null) && (
        <Grid item>
          <Typography variant="subtitle1" align="center">
            {atk_iv} | {def_iv} | {sta_iv} {inactive_stats ? '*' : ''}
          </Typography>
        </Grid>
      )}
      {(perms.stats && level !== null) && (
        <Grid item>
          <Typography variant="subtitle1" align="center">
            {t('cp')} {cp} | {t('abbreviation_level')}{level}
          </Typography>
        </Grid>
      )}
    </Grid>
  )
}

const Info = ({
  pokemon, metaData, perms, Icons, isNight,
}) => {
  const { gender, weather, form } = pokemon
  const formTypes = metaData.forms[form].types || metaData.types

  return (
    <Grid
      item
      xs={(perms.iv || perms.stats) ? 3 : 11}
      container
      direction={(perms.iv || perms.stats) ? 'column' : 'row'}
      justifyContent="space-around"
      alignItems="center"
    >
      {(weather != 0 && perms.iv) && (
        <Grid
          item
          className="grid-item"
          style={{
            height: 24,
            width: 24,
            backgroundImage: `url(${Icons.getWeather(weather, isNight)})`,
          }}
        />
      )}
      {gender && (
        <Grid item style={{ textAlign: 'center' }}>
          <Icon>
            {{
              1: 'male',
              2: 'female',
              3: 'transgender',
            }[gender] || ''}
          </Icon>
        </Grid>
      )}
      {formTypes.map(type => (
        <Grid
          item
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

const Timer = ({ pokemon, hasStats }) => {
  const { expire_timestamp, expire_timestamp_verified } = pokemon
  const despawnTimer = new Date(expire_timestamp * 1000)
  const [timer, setTimer] = useState(Utility.getTimeUntil(despawnTimer, true))

  useEffect(() => {
    const timer2 = setTimeout(() => {
      setTimer(Utility.getTimeUntil(despawnTimer, true))
    }, 1000)
    return () => clearTimeout(timer2)
  })

  return (
    <>
      <Grid item xs={hasStats ? 9 : 6}>
        <Typography variant="h6" align="center">
          {timer.str}
        </Typography>
        <Typography variant="subtitle2" align="center">
          {despawnTimer.toLocaleTimeString(localStorage.getItem('i18nextLng'))}
        </Typography>
      </Grid>
      <Grid item xs={hasStats ? 3 : 2}>
        {expire_timestamp_verified
          ? <Check fontSize="large" style={{ color: '#00e676' }} />
          : <Clear fontSize="large" color="primary" />}
      </Grid>
    </>
  )
}

const Footer = ({
  pokemon, popups, setPopups, hasPvp, classes, Icons,
}) => {
  const { navigation } = useStore(state => state.settings)
  const { navigation: { [navigation]: { url } } } = useStatic(state => state.config)

  const { lat, lon } = pokemon

  const handleExpandClick = (category) => {
    const opposite = category === 'extras' ? 'pvp' : 'extras'
    setPopups({
      ...popups,
      [category]: !popups[category],
      [opposite]: false,
    })
  }

  return (
    <>
      {hasPvp && (
        <Grid item xs={4}>
          <IconButton
            className={popups.pvp ? classes.expandOpen : classes.expand}
            name="pvp"
            onClick={() => handleExpandClick('pvp')}
            aria-expanded={popups.pvp}
          >
            <img
              src={Icons.getMisc('pvp')}
              height={20}
              width="auto"
            />
          </IconButton>
        </Grid>
      )}
      <Grid item xs={4} style={{ textAlign: 'center' }}>
        <IconButton>
          <a href={url.replace('{x}', lat).replace('{y}', lon)} target="_blank" rel="noreferrer" style={{ color: 'white' }}>
            <Map />
          </a>
        </IconButton>
      </Grid>
      <Grid item xs={4}>
        <IconButton
          className={popups.extras ? classes.expandOpen : classes.expand}
          onClick={() => handleExpandClick('extras')}
          aria-expanded={popups.extras}
        >
          <ExpandMore style={{ color: 'white' }} />
        </IconButton>
      </Grid>
    </>
  )
}

const ExtraInfo = ({
  pokemon, perms, t, Icons,
}) => {
  const { moves } = useStatic(state => state.masterfile)

  const {
    move_1, move_2, weight, size, first_seen_timestamp, updated, iv,
  } = pokemon

  return (
    <Grid
      container
      alignItems="center"
      justifyContent="center"
    >
      {(perms.iv && iv !== null) && [move_1, move_2].map((move, i) => (
        <Fragment key={move}>
          <Grid
            item
            xs={2}
            className="grid-item"
            style={{
              height: 15,
              width: 15,
              backgroundImage: `url(${Icons.getTypes(moves[move].type)})`,
            }}
          />
          <Grid item xs={6}>
            <Typography variant="caption">
              {t(`move_${move}`)}
            </Typography>
          </Grid>
          <Grid item xs={3} style={{ textAlign: 'right' }}>
            <Typography variant="caption">
              {i ? `${weight.toFixed(2)}${t('kilogram')}` : `${size.toFixed(2)}${t('meter')}`}
            </Typography>
          </Grid>
        </Fragment>
      ))}
      {[first_seen_timestamp, updated].map((time, i) => (
        time ? (
          <Fragment key={time}>
            <Grid item xs={t('popup_pokemon_description_width')} style={{ textAlign: 'center' }}>
              <Typography variant="caption">
                {i ? t('last_seen') : t('first_seen')}:
              </Typography>
            </Grid>
            <Grid item xs={t('popup_pokemon_seen_timer_width')} style={{ textAlign: 'right' }}>
              <GenericTimer expireTime={time} />
            </Grid>
            <Grid item xs={t('popup_pokemon_data_width')} style={{ textAlign: 'right' }}>
              <Typography variant="caption">
                {(new Date(time * 1000)).toLocaleTimeString(localStorage.getItem('i18nextLng'))}
              </Typography>
            </Grid>
          </Fragment>
        ) : null
      ))}
    </Grid>
  )
}

const PvpInfo = ({
  league, data, t, Icons,
}) => {
  if (data === null) return ''

  const rows = []

  data.forEach(each => {
    if (each.rank !== null && each.cp !== null) {
      const tempRow = {
        id: `${league}-${each.pokemon}-${each.form}-${each.evolution}-${each.gender}-${each.rank}-${each.cp}-${each.lvl}-${each.cap}`,
        img: <img
          src={Icons.getPokemon(each.pokemon, each.form, each.evolution, each.gender, each.costume)}
          height={20}
        />,
        rank: each.rank || 0,
        cp: each.cp || 0,
        lvl: `${each.level || ''}${each.cap && !each.capped ? `/${each.cap}` : ''}`,
        percent: (each.percentage * 100).toFixed(1) || 0,
      }
      rows.push(tempRow)
    }
  })
  const rowClass = { width: 30, fontWeight: 'bold' }

  return (
    <table className="table-pvp">
      <thead>
        <tr>
          <td style={rowClass}><img src={Icons.getMisc(league === 'great' || league === 'ultra' ? league : 'cup')} height={20} /></td>
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

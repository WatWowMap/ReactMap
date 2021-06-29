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

export default function PokemonPopup({
  pokemon, iconUrl, userSettings, isTutorial,
}) {
  const { t } = useTranslation()
  const {
    pokemon_id, cleanPvp, iv, cp,
  } = pokemon
  const { pokemon: pokemonPerms } = useStatic(state => state.ui)
  const perms = isTutorial ? {
    pvp: true, stats: true, iv: true,
  } : pokemonPerms
  const { pokemon: { [pokemon_id]: metaData } } = useStatic(state => state.masterfile)
  const [expanded, setExpanded] = useState(false)
  const [pvpExpand, setPvpExpand] = useState((userSettings.prioritizePvpInfo && perms.pvp))
  const hasLeagues = cleanPvp ? Object.keys(cleanPvp) : []
  const hasStats = iv || cp

  return (
    <Grid
      container
      style={{ minWidth: 200 }}
      alignItems="center"
      justify="center"
      spacing={1}
    >
      <Header
        pokemon={pokemon}
        metaData={metaData}
        iconUrl={iconUrl}
        t={t}
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
            perms={perms}
            t={t}
          />
          <Divider orientation="vertical" flexItem />
        </>
      )}
      <Info
        pokemon={pokemon}
        metaData={metaData}
        perms={perms}
      />
      <Footer
        pokemon={pokemon}
        expanded={expanded}
        setExpanded={setExpanded}
        pvpExpand={pvpExpand}
        setPvpExpand={setPvpExpand}
        hasPvp={hasLeagues.length > 0}
      />
      <Collapse in={pvpExpand} timeout="auto" unmountOnExit>
        {hasLeagues.map(league => (
          <PvpInfo
            key={league}
            league={league}
            data={cleanPvp[league]}
            t={t}
          />
        ))}
      </Collapse>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <ExtraInfo
          pokemon={pokemon}
          perms={perms}
          t={t}
        />
      </Collapse>
    </Grid>
  )
}

const Header = ({
  pokemon, iconUrl, metaData, t,
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

  const open = Boolean(anchorEl)
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
  return (
    <>
      <Grid item xs={3}>
        <Avatar src={iconUrl} />
      </Grid>
      <Grid item xs={6} style={{ textAlign: 'center' }}>
        <Typography variant="h5">
          {t(`poke_${metaData.pokedex_id}`)}
        </Typography>
        {ditto_form && (
          <Typography variant="caption">
            ({t(`poke_${display_pokemon_id}`)})
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
        open={open}
        onClose={handleClose}
        PaperProps={{
          style: {
            maxHeight: 216,
            width: '20ch',
          },
        }}
      >
        {options.map((option) => (
          <MenuItem key={option.name} onClick={option.action}>
            {t(option.name)}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}

const Stats = ({ pokemon, perms, t }) => {
  const {
    cp, iv, atk_iv, def_iv, sta_iv, level,
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
      justify="space-around"
      alignItems="center"
    >
      {(perms.iv && iv !== null) && (
        <Grid item>
          <Typography variant="h5" align="center" style={{ color: getColor(iv) }}>
            {iv.toFixed(2)}{t('%')}
          </Typography>
        </Grid>
      )}
      {(perms.stats && iv !== null) && (
        <Grid item>
          <Typography variant="subtitle1" align="center">
            {atk_iv} | {def_iv} | {sta_iv}
          </Typography>
        </Grid>
      )}
      {((perms.iv || perms.stats) && iv !== null) && (
        <Grid item>
          <Typography variant="subtitle1" align="center">
            {t('cp')} {cp} | {t('levelAbbreviated')}{level}
          </Typography>
        </Grid>
      )}
    </Grid>
  )
}

const Info = ({ pokemon, metaData, perms }) => {
  const { gender, weather } = pokemon

  return (
    <Grid
      item
      xs={(perms.iv || perms.stats) ? 3 : 11}
      container
      direction={(perms.iv || perms.stats) ? 'column' : 'row'}
      justify="space-around"
      alignItems="center"
    >
      {(weather != 0 && perms.iv) && (
        <Grid
          item
          className="grid-item"
          style={{
            height: 32,
            width: 32,
            backgroundImage: `url(/images/weather/${weather}.png)`,
          }}
        />
      )}
      {gender != 3 && (
        <Grid item style={{ textAlign: 'center' }}>
          <Icon>{gender === 1 ? 'male' : 'female'}</Icon>
        </Grid>
      )}
      {metaData.types.map(type => (
        <Grid
          item
          key={type}
          className="grid-item"
          style={{
            height: 20,
            width: 20,
            backgroundImage: `url(/images/type/${type.toLowerCase()}.png)`,
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
  pokemon, expanded, pvpExpand, setExpanded, setPvpExpand, hasPvp,
}) => {
  const classes = useStyles()
  const { navigation } = useStore(state => state.settings)
  const { navigation: { [navigation]: { url } } } = useStatic(state => state.config)

  const { lat, lon } = pokemon

  const handleExpandClick = () => {
    if (pvpExpand) setPvpExpand(false)
    setExpanded(!expanded)
  }

  const handlePvpClick = () => {
    if (expanded) setExpanded(false)
    setPvpExpand(!pvpExpand)
  }

  return (
    <>
      {hasPvp && (
        <Grid item xs={4}>
          <IconButton
            className={pvpExpand ? classes.expandOpen : classes.expand}
            name="pvp"
            onClick={handlePvpClick}
            aria-expanded={pvpExpand}
            aria-label="show more"
          >
            <img
              src="/images/misc/pvp.png"
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
          className={expanded ? classes.expandOpen : classes.expand}
          onClick={handleExpandClick}
          aria-expanded={expanded}
          aria-label="show more"
        >
          <ExpandMore style={{ color: 'white' }} />
        </IconButton>
      </Grid>
    </>
  )
}

const ExtraInfo = ({ pokemon, perms, t }) => {
  const { moves } = useStatic(state => state.masterfile)

  const {
    move_1, move_2, weight, size, first_seen_timestamp, updated, iv,
  } = pokemon

  return (
    <Grid
      container
      alignItems="center"
      justify="center"
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
              backgroundImage: `url(/images/type/${moves[move].type.toLowerCase()}.png)`,
            }}
          />
          <Grid item xs={6}>
            <Typography variant="caption" align="center">
              {t(`move_${move}`)}
            </Typography>
          </Grid>
          <Grid item xs={3} style={{ textAlign: 'right' }}>
            <Typography variant="caption" align="center">
              {i ? `${weight.toFixed(2)}${t('kilogram')}` : `${size.toFixed(2)}${t('meter')}`}
            </Typography>
          </Grid>
        </Fragment>
      ))}
      {[first_seen_timestamp, updated].map((time, i) => (
        <Fragment key={time}>
          <Grid item xs={5} style={{ textAlign: 'center' }}>
            <Typography variant="caption" align="center">
              {i ? t('lastSeen') : t('firstSeen')}:
            </Typography>
          </Grid>
          <Grid item xs={6} style={{ textAlign: 'right' }}>
            <Typography variant="caption" align="center">
              {(new Date(time * 1000)).toLocaleTimeString(localStorage.getItem('i18nextLng'))}
            </Typography>
          </Grid>
        </Fragment>
      ))}
    </Grid>
  )
}

const PvpInfo = ({
  league, data, t,
}) => {
  if (data === null) return ''

  const { icons } = useStore(state => state.settings)
  const { icons: { [icons]: { path } } } = useStatic(state => state.config)
  const availableForms = useStatic(state => state.availableForms)

  const rows = []

  data.forEach(each => {
    if (each.rank !== null && each.cp !== null) {
      const tempRow = {
        id: `${league}-${each.pokemon}-${each.form}-${each.evolution}-${each.gender}-${each.rank}-${each.cp}-${each.lvl}-${each.cap}`,
        img: <img src={`${path}/${Utility.getPokemonIcon(availableForms, each.pokemon, each.form, each.evolution, each.gender, each.costume)}.png`} height={20} />,
        rank: each.rank || 0,
        cp: each.cp || 0,
        lvl: `${each.level || ''}${(each.capped !== true && `/${each.cap}`) || ''}`,
        percent: (each.percentage * 100).toFixed(1) || 0,
      }
      rows.push(tempRow)
    }
  })
  const rowClass = { width: 30, fontWeight: 'bold' }
  const src = league === 'great' || league === 'ultra' ? league : 'cup'

  return (
    <table className="table-pvp">
      <thead>
        <tr>
          <td style={rowClass}><img src={`/images/misc/${src}.png`} height={20} /></td>
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

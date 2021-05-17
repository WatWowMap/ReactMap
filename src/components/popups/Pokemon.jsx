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
import { useStore, useMasterfile } from '../../hooks/useStore'
import useStyles from '../../hooks/useStyles'
import Utility from '../../services/Utility'

export default function PokemonPopup({ pokemon, iconUrl }) {
  const {
    pokemon_id,
    pvp_rankings_great_league,
    pvp_rankings_ultra_league,
  } = pokemon

  const { menus: { pokemon: perms } } = useMasterfile(state => state.ui)
  const { pokemon: { [pokemon_id]: metaData } } = useMasterfile(state => state.masterfile)

  const [expanded, setExpanded] = useState(false)
  const [pvpExpand, setPvpExpand] = useState(false)

  const great = JSON.parse(pvp_rankings_great_league)
  const ultra = JSON.parse(pvp_rankings_ultra_league)

  const getBestOrWorst = (league, best) => {
    let startRank = best ? 4096 : 1
    if (league !== null && best) {
      league.forEach(pkmn => {
        startRank = pkmn.rank < startRank ? pkmn.rank : startRank
      })
    } else if (league !== null) {
      league.forEach(pkmn => {
        startRank = pkmn.rank > startRank ? pkmn.rank : startRank
      })
    }
    return startRank
  }

  return (
    <Grid
      container
      style={{ minWidth: 200 }}
      alignItems="center"
      justify="center"
      spacing={2}
    >
      <Header
        pokemon={pokemon}
        metaData={metaData}
        iconUrl={iconUrl}
      />
      <Stats
        pokemon={pokemon}
        metaData={metaData}
        perms={perms}
      />
      <Divider orientation="vertical" flexItem />
      <Info
        pokemon={pokemon}
        metaData={metaData}
        perms={perms}
      />
      <Timer
        pokemon={pokemon}
      />
      <Collapse in={!pvpExpand} timeout="auto" unmountOnExit>
        {great && (getBestOrWorst(great, true) < 6) && <PvpInfo league="great" data={great} onlyTop5 />}
        {ultra && (getBestOrWorst(ultra, true) < 6) && <PvpInfo league="ultra" data={ultra} onlyTop5 />}
      </Collapse>
      <Footer
        pokemon={pokemon}
        expanded={expanded}
        setExpanded={setExpanded}
        pvpExpand={pvpExpand}
        setPvpExpand={setPvpExpand}
        hasPvp={getBestOrWorst(great) > 5 || getBestOrWorst(ultra) > 5}
      />
      <Collapse in={pvpExpand} timeout="auto" unmountOnExit>
        {great && <PvpInfo league="great" data={great} />}
        {ultra && <PvpInfo league="ultra" data={ultra} />}
      </Collapse>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <ExtraInfo
          pokemon={pokemon}
          perms={perms}
        />
      </Collapse>
    </Grid>
  )
}

const Header = ({ pokemon, iconUrl, metaData }) => {
  const hideList = useMasterfile(state => state.hideList)
  const setHideList = useMasterfile(state => state.setHideList)
  const excludeList = useMasterfile(state => state.excludeList)
  const setExcludeList = useMasterfile(state => state.setExcludeList)
  const timerList = useMasterfile(state => state.timerList)
  const setTimerList = useMasterfile(state => state.setTimerList)

  const [anchorEl, setAnchorEl] = useState(false)

  const open = Boolean(anchorEl)
  const { id, pokemon_id, form } = pokemon

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
    setExcludeList([...excludeList, `${pokemon_id}-${form}`])
  }

  const handleTimer = () => {
    setAnchorEl(null)
    setTimerList([...timerList, id])
  }

  const options = [
    { name: 'Hide', action: handleHide },
    { name: 'Exclude', action: handleExclude },
    { name: 'Timer', action: handleTimer },
  ]

  return (
    <>
      <Grid item xs={3}>
        <Avatar src={iconUrl} />
      </Grid>
      <Grid item xs={6}>
        <Typography variant="h5" align="center">
          {metaData.name}
        </Typography>
      </Grid>
      <Grid item xs={3}>
        <IconButton
          aria-haspopup="true"
          onClick={handleClick}
        >
          <MoreVert />
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
            {option.name}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}

const Stats = ({ pokemon, perms }) => {
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
      xs={9}
      container
      direction="column"
      justify="space-around"
      alignItems="center"
    >
      {(perms.iv && iv !== null) && (
        <Grid item>
          <Typography variant="h5" align="center" style={{ color: getColor(iv) }}>
            {iv}%
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
            CP {cp} | L{level}
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
      xs={2}
      container
      direction="column"
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

const Timer = ({ pokemon }) => {
  const { expire_timestamp, expire_timestamp_verified } = pokemon

  const [timer, setTimer] = useState(Utility.getTimeUntil(new Date(expire_timestamp * 1000), true))

  useEffect(() => {
    const timer2 = setTimeout(() => {
      setTimer(Utility.getTimeUntil(new Date(expire_timestamp * 1000), true))
    }, 1000)
    return () => clearTimeout(timer2)
  })

  return (
    <>
      <Grid item xs={9}>
        <Typography variant="h5" align="center">
          {timer.str}
        </Typography>
      </Grid>
      <Grid item xs={3}>
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
  const { navigation: { url } } = useStore(state => state.settings)

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
          <ExpandMore />
        </IconButton>
      </Grid>
    </>
  )
}

const ExtraInfo = ({ pokemon, perms }) => {
  const { moves } = useMasterfile(state => state.masterfile)

  const {
    move_1, move_2, weight, size, first_seen_timestamp, updated, iv,
  } = pokemon

  return (
    <Grid
      container
      alignItems="center"
      justify="center"
    >
      {(perms.iv && iv) && [move_1, move_2].map((move, i) => (
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
              {moves[move].name}
            </Typography>
          </Grid>
          <Grid item xs={3} style={{ textAlign: 'right' }}>
            <Typography variant="caption" align="center">
              {i ? `${weight.toFixed(2)}kg` : `${size.toFixed(2)}m`}
            </Typography>
          </Grid>
        </Fragment>
      ))}
      {[first_seen_timestamp, updated].map((time, i) => (
        <Fragment key={time}>
          <Grid item xs={5} style={{ textAlign: 'center' }}>
            <Typography variant="caption" align="center">
              {i ? 'Last Seen:' : 'First Seen:'}
            </Typography>
          </Grid>
          <Grid item xs={6} style={{ textAlign: 'right' }}>
            <Typography variant="caption" align="center">
              {(new Date(time * 1000)).toLocaleTimeString()}
            </Typography>
          </Grid>
        </Fragment>
      ))}
    </Grid>
  )
}

const PvpInfo = ({ league, data, onlyTop5 }) => {
  if (data === null) return ''

  const { path } = useStore(state => state.settings).icons
  const availableForms = useMasterfile(state => state.availableForms)

  const rows = []
  let capsExist = false

  data.forEach(eachRank => {
    if (eachRank.rank !== null && eachRank.cp !== null) {
      if (eachRank.cap && !capsExist) {
        capsExist = true
      }
      const tempRow = {
        id: `${league}-${eachRank.pokemon}-${eachRank.form}-${eachRank.evolution}-${eachRank.gender}-${eachRank.rank}-${eachRank.cp}-${eachRank.lvl}-${eachRank.cap}`,
        img: <img src={`${path}/${Utility.getPokemonIcon(availableForms, eachRank.pokemon, eachRank.form, eachRank.evolution, eachRank.gender, eachRank.costume)}.png`} height={20} />,
        rank: eachRank.rank || 0,
        cp: eachRank.cp || 0,
        lvl: eachRank.level || 0,
        cap: eachRank.cap || '',
        percent: (eachRank.percentage * 100).toFixed(1) || 0,
      }
      if (onlyTop5) {
        if (eachRank.rank <= 5) {
          rows.push(tempRow)
        }
      } else {
        rows.push(tempRow)
      }
    }
  })
  const rowClass = { width: 30, fontWeight: 'bold' }

  return (
    <table className="table-pvp">
      <thead>
        <tr>
          <td style={rowClass}><img src={`/images/misc/${league}.png`} height={20} /></td>
          <td style={rowClass}>Rank</td>
          <td style={rowClass}>CP</td>
          <td style={rowClass}>Lvl</td>
          {capsExist && <td style={rowClass}>Cap</td>}
          <td style={rowClass}>%</td>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td> {row.img}</td>
            <td>{row.rank}</td>
            <td>{row.cp}</td>
            <td>{row.lvl}</td>
            {capsExist && <td>{row.cap}</td>}
            <td>{row.percent}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

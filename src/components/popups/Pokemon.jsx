/* eslint-disable camelcase */
import React, { Fragment, useState, useEffect } from 'react'
import {
  Grid, Avatar, Typography, Icon, Collapse, IconButton, Divider, Menu, MenuItem,
} from '@material-ui/core'
import {
  Check, Clear, ExpandMore, Map, MoreVert,
} from '@material-ui/icons'
import { makeStyles } from '@material-ui/core/styles'
import clsx from 'clsx'
import Pvp from './Pvp'
import { useStore, useMasterfile } from '../../hooks/useStore'
import Utility from '../../services/Utility'

const useStyles = makeStyles((theme) => ({
  expand: {
    transform: 'rotate(0deg)',
    marginLeft: 'auto',
    transition: theme.transitions.create('transform', {
      duration: theme.transitions.duration.shortest,
    }),
  },
  expandOpen: {
    transform: 'rotate(180deg)',
  },
}))

const ITEM_HEIGHT = 48

export default function PokemonPopup({
  pokemon, iconUrl, showTimer, setShowTimer,
}) {
  const [expanded, setExpanded] = useState(false)
  const [pvpExpand, setPvpExpand] = useState(false)
  const [anchorEl, setAnchorEl] = useState(null)
  const hideList = useMasterfile(state => state.hideList)
  const setHideList = useMasterfile(state => state.setHideList)
  const excludeList = useMasterfile(state => state.excludeList)
  const setExcludeList = useMasterfile(state => state.setExcludeList)
  const { menus: { pokemon: perms } } = useMasterfile(state => state.ui)

  const open = Boolean(anchorEl)
  const classes = useStyles()
  const {
    pokemon_id, weight, size, gender, cp, iv, atk_iv, def_iv, sta_iv, lat, lon, first_seen_timestamp, updated, form, id,
    weather, expire_timestamp, move_1, move_2, level, expire_timestamp_verified, great, ultra,
  } = pokemon

  const [timer, setTimer] = useState(Utility.getTimeUntil(new Date(expire_timestamp * 1000), true))
  const ivColors = {
    0: 'red', 66: 'orange', 82: 'yellow', 100: 'green',
  }
  let selectedColor
  Object.keys(ivColors).forEach(range => iv >= parseInt(range) ? selectedColor = ivColors[range] : '')

  const masterfile = useMasterfile(state => state.masterfile)
  const { navigation: { url } } = useStore(state => state.settings)
  const pkmn = masterfile.pokemon[pokemon_id]

  useEffect(() => {
    const timer2 = setTimeout(() => {
      setTimer(Utility.getTimeUntil(new Date(expire_timestamp * 1000), true))
    }, 1000)
    return () => clearTimeout(timer2)
  })

  const handleExpandClick = () => {
    setExpanded(!expanded)
  }

  const handlePvpClick = () => {
    setPvpExpand(!pvpExpand)
  }

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleHide = () => {
    setHideList([...hideList, id])
  }

  const handleExclude = () => {
    setExcludeList([...excludeList, `${pokemon_id}-${form}`])
  }

  const handleTimer = () => {
    setShowTimer(!showTimer)
  }

  const options = [
    { name: 'Hide', action: handleHide },
    { name: 'Exclude', action: handleExclude },
    { name: 'Timer', action: handleTimer },
  ]

  return (
    <Grid
      container
      style={{ minWidth: 200 }}
      alignItems="center"
      justify="center"
      spacing={2}
    >
      <Grid item xs={3}>
        <Avatar src={iconUrl} />
      </Grid>
      <Grid item xs={6}>
        <Typography variant="h5" align="center">
          {pkmn.name}
        </Typography>
      </Grid>
      <Grid item xs={3}>
        <IconButton
          aria-haspopup="true"
          onClick={handleClick}
        >
          <MoreVert />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          keepMounted
          open={open}
          onClose={handleClose}
          PaperProps={{
            style: {
              maxHeight: ITEM_HEIGHT * 4.5,
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
      </Grid>
      <Grid
        item
        xs={9}
        container
        direction="column"
        justify="space-around"
        alignItems="center"
      >
        {(perms.iv && iv) && (
          <Grid item>
            <Typography variant="h4" align="center" style={{ color: selectedColor }}>
              {iv}%
            </Typography>
          </Grid>
        )}
        {(perms.stats && atk_iv) && (
          <Grid item>
            <Typography variant="subtitle1" align="center">
              {atk_iv} | {def_iv} | {sta_iv}
            </Typography>
          </Grid>
        )}
        {((perms.iv || perms.stats) && (iv || atk_iv)) && (
          <Grid item>
            <Typography variant="subtitle1" align="center">
              CP {cp} (Lvl {level})
            </Typography>
          </Grid>
        )}
      </Grid>
      <Divider orientation="vertical" flexItem />
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
        {pkmn.types.map(type => (
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
      <Grid item xs={9}>
        <Typography variant="h4" align="center">
          {timer.str}
        </Typography>
      </Grid>
      <Grid item xs={3}>
        {expire_timestamp_verified
          ? <Check fontSize="large" style={{ color: 'green' }} />
          : <Clear fontSize="large" color="primary" />}
      </Grid>
      {(great || ultra) && (
        <Grid item xs={4}>
          <IconButton
            className={clsx(classes.expand, {
              [classes.expandOpen]: pvpExpand,
            })}
            onClick={handlePvpClick}
            aria-expanded={pvpExpand}
            aria-label="show more"
          >
            <img
              src="/images/misc/gbl.png"
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
          className={clsx(classes.expand, {
            [classes.expandOpen]: expanded,
          })}
          onClick={handleExpandClick}
          aria-expanded={expanded}
          aria-label="show more"
        >
          <ExpandMore />
        </IconButton>
      </Grid>
      <Collapse in={pvpExpand} timeout="auto" unmountOnExit>
        {great && <Pvp league="great" data={great} />}
        {ultra && <Pvp league="ultra" data={ultra} />}
      </Collapse>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
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
                  backgroundImage: `url(/images/type/${masterfile.moves[move].type.toLowerCase()}.png)`,
                }}
              />
              <Grid item xs={7}>
                <Typography variant="caption" align="center">
                  {masterfile.moves[move].name}
                </Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="caption" align="center">
                  {i ? `${weight.toFixed(2)}kg` : `${size.toFixed(2)}m`}
                </Typography>
              </Grid>
            </Fragment>
          ))}
          {[first_seen_timestamp, updated].map((time, i) => (
            <Fragment key={time}>
              <Grid item xs={7}>
                <Typography variant="caption" align="center">
                  {i ? 'Last Seen:' : 'First Seen:'}
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" align="center">
                  {(new Date(time * 1000)).toLocaleTimeString()}
                </Typography>
              </Grid>
            </Fragment>
          ))}
        </Grid>
      </Collapse>
    </Grid>
  )
}

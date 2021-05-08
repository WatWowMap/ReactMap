/* eslint-disable camelcase */
import React, { useState, useEffect } from 'react'
import {
  Grid, Typography, Icon,
} from '@material-ui/core'
import { Check, Clear } from '@material-ui/icons'

import { makeStyles } from '@material-ui/core/styles'
import clsx from 'clsx'
import Card from '@material-ui/core/Card'
import CardHeader from '@material-ui/core/CardHeader'
import CardMedia from '@material-ui/core/CardMedia'
import CardContent from '@material-ui/core/CardContent'
import CardActions from '@material-ui/core/CardActions'
import Collapse from '@material-ui/core/Collapse'
import Avatar from '@material-ui/core/Avatar'
import IconButton from '@material-ui/core/IconButton'
import { red } from '@material-ui/core/colors'
import FavoriteIcon from '@material-ui/icons/Favorite'
import ShareIcon from '@material-ui/icons/Share'
import ExpandMoreIcon from '@material-ui/icons/ExpandMore'
import MoreVertIcon from '@material-ui/icons/MoreVert'
import Utility from '../../services/Utility'
import NavLinks from './NavLinks'
import { useMasterfile } from '../../hooks/useStore'

const useStyles = makeStyles((theme) => ({

  media: {
    minHeight: 100,
  },
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

export default function PokemonPopup({ pokemon, iconUrl }) {
  const classes = useStyles()
  const [expanded, setExpanded] = React.useState(false)

  const handleExpandClick = () => {
    setExpanded(!expanded)
  }

  const {
    pokemon_id, weight, size, gender, cp, iv, atk_iv, def_iv, sta_iv, lat, lon,
    weather, expire_timestamp, move_1, move_2, level, expire_timestamp_verified,
  } = pokemon

  const [timer, setTimer] = useState(Utility.getTimeUntil(new Date(expire_timestamp * 1000), true))

  const masterfile = useMasterfile(state => state.masterfile)
  const pkmn = masterfile.pokemon[pokemon_id]

  useEffect(() => {
    const timer2 = setTimeout(() => {
      setTimer(Utility.getTimeUntil(new Date(expire_timestamp * 1000), true))
    }, 1000)
    return () => clearTimeout(timer2)
  })

  return (
    <Card className={classes.root}>
      <CardHeader
        avatar={(
          <Avatar src={iconUrl} className={classes.avatar} />
        )}
        title={pkmn.name}
        subheader={timer.str}
      />
      <Grid
        container
        direction="row"
        justify="center"
        alignItems="center"
      >
        <Grid
          item
          xs={10}
          container
          direction="row"
          justify="space-around"
          alignItems="center"
        >
          <Grid item xs={12}>
            <Typography variant="h4" align="center">
              {iv}%
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle1" align="center">
              {atk_iv} | {def_iv} | {sta_iv}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle1" align="center">
              CP {cp} (Lvl {level})
            </Typography>
          </Grid>
        </Grid>
        <Grid
          item
          xs={2}
          container
          direction="row"
          justify="space-around"
          alignItems="center"
        >
          {gender != 3 && (
            <Grid item xs={12} style={{ textAlign: 'center' }}>
              <Icon>{gender === 1 ? 'male' : 'female'}</Icon>
            </Grid>
          )}
          {weather != 0 && (
            <Grid
              item
              xs={12}
              className="grid-item"
              style={{
                height: 32,
                width: 32,
                backgroundImage: `url(/images/weather/${weather}.png)`,
              }}
            />
          )}
          {pkmn.types.map(type => (
            <Grid
              item
              xs={12}
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
      </Grid>
      <CardActions disableSpacing>
        <IconButton aria-label="add to favorites">
          <FavoriteIcon />
        </IconButton>
        <IconButton aria-label="share">
          <ShareIcon />
        </IconButton>
        <IconButton
          className={clsx(classes.expand, {
            [classes.expandOpen]: expanded,
          })}
          onClick={handleExpandClick}
          aria-expanded={expanded}
          aria-label="show more"
        >
          <ExpandMoreIcon />
        </IconButton>
      </CardActions>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <CardContent>
          <Grid
            container
            item
            xs={6}
            alignItems="center"
            justify="center"
          >
            <Grid item xs={12}>
              {iv}%
            </Grid>
            <Grid item>
              {atk_iv} | {def_iv} | {sta_iv}
            </Grid>
            <Grid item>
              CP {cp} (Lvl {level})
            </Grid>
            <Grid item>
              {weight.toFixed(2)}kg | {size.toFixed(2)}m
            </Grid>
          </Grid>
        </CardContent>
      </Collapse>
    </Card >
  )
}

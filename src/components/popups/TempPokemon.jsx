/* eslint-disable camelcase */
import React, { useState, useEffect } from 'react'
import {
  Grid,
} from '@material-ui/core'
import { Check, Clear } from '@material-ui/icons'
import { useMasterfile } from '../../hooks/useStore'
import NavLinks from './NavLinks'
import Utility from '../../services/Utility'

export default function PokemonPopup({ pokemon, iconUrl }) {
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
    <Grid
      container
      style={{ minWidth: 200 }}
      alignItems="center"
      justify="center"
    >
      <Grid item xs={6}>
        {pkmn.name}
      </Grid>
      <Grid item xs={3}>
        (#{pokemon_id})
      </Grid>
      {gender != 3 && (
        <Grid item xs={1}>
          {gender === 1 ? '♂' : '♀'}
        </Grid>
      )}
      {weather != 0 && (
        <Grid item xs={2}>
          <div
            className="grid-item"
            style={{
              height: 32,
              backgroundImage: `url(/images/weather/${weather}.png)`,
            }}
          />
        </Grid>
      )}
      <Grid
        container
        item
        xs={6}
        alignItems="center"
        justify="center"
      >
        <Grid item xs={12}>
          <div
            className="grid-item"
            style={{
              height: 50,
              backgroundImage: `url(${iconUrl})`,
            }}
          />
        </Grid>
        {pkmn.types.map(type => (
          <Grid item xs={pkmn.types.length === 1 ? 12 : 3} key={type}>
            <div
              className="grid-item"
              style={{
                height: 10,
                backgroundImage: `url(/images/type/${type.toLowerCase()}.png)`,
              }}
            />
          </Grid>
        ))}
      </Grid>
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
      {[move_1, move_2].map(move => (
        <Grid item key={move}>
          <div>
            <img src={`/images/type/${masterfile.moves[move].type.toLowerCase()}.png`} height={10} />
            &nbsp;&nbsp;{masterfile.moves[move].name}

          </div>
        </Grid>
      ))}
      <Grid item xs={6}>
        Despawn:
      </Grid>
      <Grid item xs={6}>
        {expire_timestamp_verified
          ? <Check fontSize="small" />
          : <Clear fontSize="small" />}
        {timer.str}
      </Grid>
      <NavLinks lat={lat} lon={lon} />
    </Grid>
  )
}

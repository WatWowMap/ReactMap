/* eslint-disable no-nested-ternary */
import React from 'react'
import { Grid, Typography, IconButton } from '@material-ui/core'
import { DeleteForever, Edit } from '@material-ui/icons'

// const base = {
//   clean: 0,
//   distance: 0,
//   form: 0,
//   gender: 0,
//   atk: 0,
//   max_atk: 15,
//   min_cp: 0,
//   max_cp: 9000,
//   def: 0,
//   max_def: 15,
//   min_iv: -1,
//   max_iv: 100,
//   min_level: 0,
//   max_level: 40,
//   max_rarity: 6,
//   sta: 0,
//   max_sta: 15,
//   max_weight: 9000000,
//   min_time: 0,
//   min_weight: 0,
//   pokemon_id: 25,
//   profile_no: 1,
//   pvp_ranking_best: 1,
//   pvp_ranking_league: 0,
//   pvp_ranking_min_cp: 0,
//   pvp_ranking_worst: 4096,
// }

export default function PokemonTile({ data, rowIndex, columnIndex, style }) {
  const {
    tileItem, columnCount, Icons, syncWebhook,
  } = data

  const item = tileItem[rowIndex * columnCount + columnIndex]
  if (!item) return null

  const backgroundColor = columnIndex % 2
    ? rowIndex % 2 === 0
      ? 'rgba(1, 1, 1, 0.01)'
      : 'rgba(240, 240, 240, 0.01)'
    : rowIndex % 2
      ? 'rgba(1, 1, 1, 0.01)'
      : 'rgba(240, 240, 240, 0.01)'

  return (
    <Grid
      container
      item
      xs={12}
      style={{ ...style, backgroundColor }}
      justifyContent="center"
      alignItems="center"
    >
      <Grid item xs={2} sm={1}>
        <img
          src={Icons.getPokemon(item.pokemon_id, item.form, 0, item.gender)}
          style={{ maxWidth: 40, maxHeight: 40 }}
        />
      </Grid>
      <Grid item xs={8} sm={9}>
        <Typography variant="caption">
          {item.description.replace(/\**/g, '')}
        </Typography>
      </Grid>
      <Grid item xs={1}>
        <IconButton size="small"
        // onClick={toggleDialog(false, '', 'search')}
        >
          <Edit style={{ color: 'white' }} />
        </IconButton>
      </Grid>
      <Grid item xs={1}>
        <IconButton size="small"
        // onClick={toggleDialog(false, '', 'search')}
        >
          <DeleteForever style={{ color: 'white' }} />
        </IconButton>
      </Grid>
    </Grid>
  )
}

/* eslint-disable no-nested-ternary */
import React, { useState } from 'react'
import {
  Grid, Typography, IconButton, Dialog, Checkbox,
} from '@material-ui/core'
import { DeleteForever, Edit } from '@material-ui/icons'

import WebhookAdvanced from '@components/layout/dialogs/webhooks/WebhookAdv'

const generateDescription = (pkmn, leagues, isMobile) => {
  if (isMobile) {
    return pkmn.pvp_ranking_league
      ? `${leagues.find(league => league.cp === pkmn.pvp_ranking_league).name} ${pkmn.pvp_ranking_best}-${pkmn.pvp_ranking_worst}`
      : `${pkmn.min_iv}-${pkmn.max_iv}% | L${pkmn.min_level}-${pkmn.max_level}
      A${pkmn.atk}-${pkmn.max_atk} | D${pkmn.def}-${pkmn.max_def} | S${pkmn.sta}-${pkmn.max_sta}${pkmn.distance ? ` | d${pkmn.distance}` : ''}`
  }
  return pkmn.description?.replace(/\**/g, '')
}

export default function PokemonTile({ data, rowIndex, columnIndex, style }) {
  const {
    tileItem, columnCount, Icons, syncWebhook, selectedWebhook, selected, setSelected,
    currentPokemon, setCurrentPokemon, isMobile, setSend, setTempFilters, leagues,
  } = data
  const [editDialog, setEditDialog] = useState(false)
  const item = tileItem[rowIndex * columnCount + columnIndex]
  if (!item) return null

  const backgroundColor = columnIndex % 2
    ? rowIndex % 2 === 0
      ? 'rgba(1, 1, 1, 0.01)'
      : 'rgba(240, 240, 240, 0.01)'
    : rowIndex % 2
      ? 'rgba(1, 1, 1, 0.01)'
      : 'rgba(240, 240, 240, 0.01)'

  const toggleWebhook = (open, id, newFilters) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return
    }
    setEditDialog(open)
    if (id && newFilters && !Object.keys(newFilters).every(key => newFilters[key] === item[key])) {
      // eslint-disable-next-line camelcase
      const [pokemon_id, form] = id.split('-')
      syncWebhook({
        variables: {
          category: 'pokemon',
          data: { uid: item.uid },
          name: selectedWebhook,
          status: 'POST',
        },
      })
      setTempFilters({ [id]: { ...newFilters, pokemon_id, form, enabled: true } })
      setSend(true)
    }
  }

  const handleChange = (event) => {
    setSelected({ ...selected, [item.uid]: event.target.checked })
  }

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
      <Grid item xs={6} sm={9}>
        <Typography variant="caption">
          {generateDescription(item, leagues, isMobile)}
        </Typography>
      </Grid>
      <Grid item xs={4} sm={2}>
        <IconButton size="small" onClick={() => setEditDialog(true)}>
          <Edit style={{ color: 'white' }} />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => {
            setCurrentPokemon(currentPokemon.filter(p => p.uid !== item.uid))
            syncWebhook({
              variables: {
                category: 'pokemon',
                data: { uid: item.uid },
                name: selectedWebhook,
                status: 'DELETE',
              },
            })
          }}
        >
          <DeleteForever style={{ color: 'white' }} />
        </IconButton>
        <Checkbox
          size="small"
          checked={Boolean(selected[item.uid])}
          onChange={handleChange}
        />
      </Grid>
      <Dialog
        open={editDialog}
        fullWidth={!isMobile}
        fullScreen={isMobile}
      >
        <WebhookAdvanced
          id={`${item.pokemon_id}-${item.form}`}
          category="pokemon"
          isMobile={isMobile}
          toggleWebhook={toggleWebhook}
          tempFilters={item}
        />
      </Dialog>
    </Grid>
  )
}

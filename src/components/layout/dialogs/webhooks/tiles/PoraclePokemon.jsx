/* eslint-disable no-nested-ternary */
import React, { useState } from 'react'
import { Grid, Typography, IconButton, Dialog } from '@material-ui/core'
import { DeleteForever, Edit } from '@material-ui/icons'

import WebhookAdvanced from '@components/layout/dialogs/webhooks/WebhookAdv'

export default function PokemonTile({ data, rowIndex, columnIndex, style }) {
  const {
    tileItem, columnCount, Icons, syncWebhook, selectedWebhook,
    currentPokemon, setCurrentPokemon, isMobile, setSend, setTempFilters,
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
          {item.description?.replace(/\**/g, '')}
        </Typography>
      </Grid>
      <Grid item xs={1}>
        <IconButton size="small" onClick={() => setEditDialog(true)}>
          <Edit style={{ color: 'white' }} />
        </IconButton>
      </Grid>
      <Grid item xs={1}>
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

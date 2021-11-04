/* eslint-disable no-nested-ternary */
import React, { useState } from 'react'
import {
  Grid, Typography, IconButton, Dialog, Checkbox,
} from '@material-ui/core'
import { DeleteForever, Edit } from '@material-ui/icons'

import WebhookAdvanced from '@components/layout/dialogs/webhooks/WebhookAdv'

export default function PokemonTile({ data, rowIndex, columnIndex, style }) {
  const {
    tileItem, columnCount, Icons, syncWebhook, selectedWebhook, selected, setSelected,
    tracked, setTracked, isMobile, setSend, setTempFilters, leagues, category, t, Poracle, invasions,
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

  const id = Poracle.getId(item, category, invasions)
  if (category === 'invasion') {
    item.grunt_id = Object.keys(invasions).find(key => invasions[key]?.type?.toLowerCase() === item.grunt_type)
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
          src={Icons.getIconById(id)}
          style={{ maxWidth: 40, maxHeight: 40 }}
        />
      </Grid>
      <Grid item xs={6} sm={8} md={9}>
        <Typography variant="caption">
          {Poracle.generateDescription(item, category, leagues, t)?.replace(/\*/g, '')}
        </Typography>
      </Grid>
      <Grid item xs={4} sm={3} md={2} style={{ textAlign: 'right' }}>
        <IconButton size="small" onClick={() => setEditDialog(true)}>
          <Edit style={{ color: 'white' }} />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => {
            setTracked(tracked.filter(p => p.uid !== item.uid))
            syncWebhook({
              variables: {
                category,
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
          color="secondary"
        />
      </Grid>
      <Dialog
        open={editDialog}
        fullWidth={!isMobile}
        fullScreen={isMobile}
      >
        <WebhookAdvanced
          id={id}
          category={category}
          isMobile={isMobile}
          toggleWebhook={toggleWebhook}
          tempFilters={item}
        />
      </Dialog>
    </Grid>
  )
}

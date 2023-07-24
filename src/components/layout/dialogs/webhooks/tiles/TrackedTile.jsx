import React, { useState } from 'react'
import DeleteForever from '@mui/icons-material/DeleteForever'
import Edit from '@mui/icons-material/Edit'
import { Grid, Typography, IconButton, Dialog, Checkbox } from '@mui/material'

import WebhookAdvanced from '@components/layout/dialogs/webhooks/WebhookAdv'

export default function PokemonTile({ data, rowIndex, columnIndex, style }) {
  const {
    tileItem,
    columnCount,
    Icons,
    syncWebhook,
    selectedWebhook,
    selected,
    setSelected,
    Utility,
    tracked,
    setTracked,
    isMobile,
    setSend,
    setTempFilters,
    category,
    Poracle,
    invasions,
  } = data
  const [editDialog, setEditDialog] = useState(false)
  const item = tileItem[rowIndex * columnCount + columnIndex]
  if (!item) return null

  const toggleWebhook = (open, id, newFilters) => (event) => {
    if (
      event.type === 'keydown' &&
      (event.key === 'Tab' || event.key === 'Shift')
    ) {
      return
    }
    setEditDialog(open)
    if (
      id &&
      newFilters &&
      !Object.keys(newFilters).every((key) => newFilters[key] === item[key])
    ) {
      setTempFilters({ [id]: { ...newFilters, enabled: true } })
      setSend(true)
    }
  }

  const handleChange = (event) => {
    setSelected({ ...selected, [item.uid]: event.target.checked })
  }

  const id = Poracle.getId(item, category, invasions)
  if (item.form !== undefined) {
    item.allForms = !item.form
  }
  if (category === 'invasion') {
    item.grunt_id = Object.keys(invasions).find(
      (key) =>
        invasions[key]?.type?.toLowerCase() === item.grunt_type.toLowerCase() &&
        invasions[key].gender === (item.gender || 1),
    )
  }
  if (category === 'pokemon') {
    item.pvpEntry = Boolean(item.pvp_ranking_league)
    item.xs = item.max_weight !== 9000000
    item.xl = item.min_weight !== 0
  }
  if (category === 'raid') {
    item.allMoves = item.move === 9000
  }
  return (
    <Grid
      container
      item
      xs={12}
      style={{
        ...style,
        backgroundColor: Utility.getTileBackground(columnIndex, rowIndex),
      }}
      justifyContent="center"
      alignItems="center"
    >
      <Grid item xs={2} sm={1}>
        <img
          src={Icons.getIconById(id)}
          alt={id}
          style={{ maxWidth: 40, maxHeight: 40 }}
        />
      </Grid>
      <Grid item xs={6} sm={8} md={9}>
        <Typography variant="caption">{item.description}</Typography>
      </Grid>
      <Grid item xs={4} sm={3} md={2} style={{ textAlign: 'right' }}>
        <IconButton size="small" onClick={() => setEditDialog(true)}>
          <Edit />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => {
            setTracked(tracked.filter((p) => p.uid !== item.uid))
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
          <DeleteForever />
        </IconButton>
        <Checkbox
          size="small"
          checked={Boolean(selected[item.uid])}
          onChange={handleChange}
          color="secondary"
        />
      </Grid>
      <Dialog
        open={!!(editDialog && id)}
        fullWidth={!isMobile}
        fullScreen={isMobile}
        onClose={() => setEditDialog(false)}
      >
        <WebhookAdvanced
          id={id}
          category={category}
          isMobile={isMobile}
          toggleWebhook={toggleWebhook}
          tempFilters={{ ...item, byDistance: Boolean(item.distance) }}
        />
      </Dialog>
    </Grid>
  )
}

import React, { useState } from 'react'
import { Grid, IconButton, Typography } from '@material-ui/core'
import {
  Check, Clear, Tune,
} from '@material-ui/icons'

const getOtherData = (id) => {
  switch (id.charAt(0)) {
    case 'e':
    case 'r': return { level: id.slice(1) }
    default: return { pokemon_id: id.split('-')[0], form: id.split('-')[1] }
  }
}
export default function NewPokemon({
  data, rowIndex, columnIndex, style,
}) {
  const [name, setName] = useState(true)
  const {
    tileItem, columnCount, tempFilters, setTempFilters, isMobile, type, Utility, toggleWebhook,
  } = data

  const item = tileItem[rowIndex * columnCount + columnIndex]

  if (!item) {
    return ''
  }

  const handleFilterChange = () => {
    setTempFilters({
      ...tempFilters,
      [item.id]: tempFilters[item.id] ? {
        ...tempFilters[item.id],
        enabled: !tempFilters[item.id]?.enabled,
      } : tempFilters[item.id] = { enabled: true, ...getOtherData(item.id) },
    })
    Utility.analytics('Webhook Filtering', `${item.name} Status: ${!tempFilters[item.id]?.enabled}`, type)
  }

  const image = (
    <img
      className="grid-item"
      src={item.url}
      alt={item.url}
      style={{
        maxHeight: isMobile ? 50 : 75,
        maxWidth: isMobile ? 50 : 75,
      }}
      onClick={handleFilterChange}
    />
  )
  const selection = (
    <IconButton onClick={handleFilterChange}>
      {tempFilters[item.id] && tempFilters[item.id]?.enabled
        ? <Check style={{ color: '#00e676' }} />
        : <Clear color="primary" />}
    </IconButton>
  )

  const advMenu = (
    <IconButton
      onClick={toggleWebhook(true, item.id)}
    >
      <Tune style={{ color: 'white' }} />
    </IconButton>
  )

  const nameTitle = (
    <Typography
      variant="subtitle2"
      align="center"
      noWrap={name}
      onClick={() => setName(!name)}
    >
      {item.name}
    </Typography>
  )

  return (
    <Grid
      style={{
        ...style,
        backgroundColor: Utility.getTileBackground(columnIndex, rowIndex),
        textAlign: 'center',
      }}
      container
      justifyContent="center"
      alignItems="center"
      spacing={isMobile ? 2 : 0}
    >
      <Grid item xs={3} sm={7}>
        {image}
      </Grid>
      <Grid item xs={5}>
        {isMobile ? nameTitle : selection}
        {!isMobile && advMenu}
      </Grid>
      <Grid item xs={2} sm={12}>
        {isMobile ? advMenu : nameTitle}
      </Grid>
      {isMobile && (
        <Grid item xs={2}>
          {selection}
        </Grid>
      )}
    </Grid>
  )
}

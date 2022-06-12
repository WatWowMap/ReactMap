import React, { useState } from 'react'
import { Grid, IconButton, Typography } from '@material-ui/core'
import {
  Check, Clear, Tune, FormatSize, Settings,
} from '@material-ui/icons'

export default function MenuTile({
  data, rowIndex, columnIndex, style,
}) {
  const [name, setName] = useState(true)
  const {
    tileItem, columnCount, tempFilters, setTempFilters, toggleAdvMenu,
    isMobile, type, toggleSlotsMenu, Utility, standard,
  } = data

  const item = tileItem[rowIndex * columnCount + columnIndex]

  if (!item) {
    return ''
  }

  const handleFilterChange = () => {
    const newFilter = tempFilters[item.id]
      ? { ...tempFilters[item.id], enabled: !tempFilters[item.id].enabled }
      : { ...standard, enabled: true }
    setTempFilters({
      ...tempFilters,
      [item.id]: newFilter,
    })
    Utility.analytics('Filtering', `${item.name} Status: ${!tempFilters[item.id]?.enabled}`, type)
  }

  const image = (
    <img
      className="grid-item"
      alt={item.url}
      src={item.url}
      style={{
        maxHeight: isMobile ? 50 : 75,
        maxWidth: isMobile ? 50 : 75,
      }}
      onClick={handleFilterChange}
    />
  )
  const selection = (
    <IconButton onClick={handleFilterChange}>
      {tempFilters[item.id]?.enabled
        ? <Check style={{ color: '#00e676' }} />
        : <Clear color="primary" />}
    </IconButton>
  )

  const getAdvMenuIcon = () => {
    if (type === 'pokemon') {
      return <Tune style={{ color: 'white' }} />
    }
    if ((type === 'pokestops' && !item.id.startsWith('l') && !item.id.startsWith('i'))
      || (item.id.startsWith('t') && parseInt(item.id.charAt(1)) > 0)) {
      return <Settings style={{ color: 'white' }} />
    }
    return <FormatSize style={{ color: 'white' }} />
  }
  const advMenu = (
    <IconButton
      onClick={(item.id.startsWith('t') && parseInt(item.id.charAt(1)) > 0)
        ? toggleSlotsMenu(true, item.id.charAt(1)) : toggleAdvMenu(true, item.id)}
    >
      {getAdvMenuIcon()}
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

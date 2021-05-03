/* eslint-disable no-nested-ternary */
import React from 'react'
import { Grid, IconButton, Typography } from '@material-ui/core'
import { Check, Clear, Menu } from '@material-ui/icons'

export default function MenuTile({
  data, rowIndex, columnIndex, style,
}) {
  const {
    tileItem, columnCount, tempFilters, setTempFilters, toggleAdvMenu, isMobile,
  } = data

  const item = tileItem[rowIndex * columnCount + columnIndex]

  if (!item) {
    return ''
  }

  const backgroundColor = columnIndex % 2
    ? rowIndex % 2 === 0
      ? 'rgba(1, 1, 1, 0.01)'
      : 'rgba(240, 240, 240, 0.01)'
    : rowIndex % 2
      ? 'rgba(1, 1, 1, 0.01)'
      : 'rgba(240, 240, 240, 0.01)'

  const image = (
    <div
      className="grid-item"
      style={{
        height: isMobile ? 50 : 75,
        backgroundImage: item.url,
      }}
    />
  )
  const selection = (
    <IconButton onClick={() => {
      setTempFilters({
        ...tempFilters,
        [item.id]: {
          ...tempFilters[item.id],
          enabled: !tempFilters[item.id].enabled,
        },
      })
    }}
    >
      {tempFilters[item.id].enabled
        ? <Check style={{ color: '#00e676' }} />
        : <Clear color="primary" />}
    </IconButton>
  )
  const advMenu = (
    <IconButton
      onClick={toggleAdvMenu(true, item.id)}
    >
      <Menu style={{ color: 'white' }} />
    </IconButton>
  )

  const nameTitle = (
    <Typography
      variant={isMobile ? 'h6' : 'subtitle1'}
      align="center"
    >
      {item.name}
    </Typography>
  )

  return (
    <Grid
      style={{ ...style, backgroundColor, textAlign: 'center' }}
      container
      justify="center"
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

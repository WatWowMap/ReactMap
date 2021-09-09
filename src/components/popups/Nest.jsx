/* eslint-disable camelcase */
import React, { useState } from 'react'
import {
  Grid, Typography, IconButton, Divider, Menu, MenuItem,
} from '@material-ui/core'
import { MoreVert } from '@material-ui/icons'
import { useTranslation } from 'react-i18next'

import { useStore, useStatic } from '@hooks/useStore'
import Utility from '@services/Utility'

export default function NestPopup({
  nest, iconUrl, pokemon, recent,
}) {
  const { t } = useTranslation()
  const hideList = useStatic(state => state.hideList)
  const setHideList = useStatic(state => state.setHideList)
  const excludeList = useStatic(state => state.excludeList)
  const setExcludeList = useStatic(state => state.setExcludeList)
  const filters = useStore(state => state.filters)
  const setFilters = useStore(state => state.setFilters)
  const [parkName, setParkName] = useState(true)
  const [anchorEl, setAnchorEl] = useState(false)
  const {
    id, name, updated, pokemon_avg,
  } = nest

  const lastUpdated = Utility.getTimeUntil((new Date(updated * 1000)))

  const getColor = (timeSince) => {
    let color = '#00e676'
    if (timeSince > 604800) {
      color = '#ffeb3b'
    }
    if (timeSince > 1209600) {
      color = '#ff5722'
    }
    return color
  }

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleHide = () => {
    setAnchorEl(null)
    setHideList([...hideList, id])
  }

  const handleExclude = () => {
    setAnchorEl(null)
    const key = `${pokemon.pokemon_id}-${pokemon.pokemon_form}`
    setFilters({
      ...filters,
      nests: {
        ...filters.nests,
        filter: {
          ...filters.nests.filter,
          [key]: {
            ...filters.nests.filter[key],
            enabled: false,
          },
        },
      },
    })
    setExcludeList([...excludeList, key])
  }

  const options = [
    { name: 'hide', action: handleHide },
    { name: 'exclude', action: handleExclude },
  ]

  return (
    <Grid
      container
      justifyContent="center"
      alignItems="center"
      style={{ width: 200 }}
      spacing={1}
    >
      <Grid item xs={9}>
        <Typography
          variant={name.length > 20 ? 'subtitle2' : 'h6'}
          align="center"
          noWrap={parkName}
          onClick={() => setParkName(!parkName)}
        >
          {name}
        </Typography>
      </Grid>
      <Grid item xs={3}>
        <IconButton
          aria-haspopup="true"
          onClick={handleClick}
        >
          <MoreVert style={{ color: 'white' }} />
        </IconButton>
      </Grid>
      <Menu
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          style: {
            maxHeight: 216,
            minWidth: '20ch',
          },
        }}
      >
        {options.map((option) => (
          <MenuItem key={option.key || option.name} onClick={option.action}>
            {typeof option.name === 'string' ? t(option.name) : option.name}
          </MenuItem>
        ))}
      </Menu>
      <Grid item xs={6} style={{ textAlign: 'center' }}>
        <img
          src={iconUrl}
          style={{
            maxHeight: 75,
            maxWidth: 75,
          }}
        />
        <br />
        <Typography variant="caption">
          {t(`poke_${pokemon.pokemon_id}`)}
        </Typography>
      </Grid>
      <Grid item xs={6} style={{ textAlign: 'center' }}>
        <Typography variant="subtitle2">
          {t('lastUpdated')}
        </Typography>
        <Typography variant={lastUpdated.str.includes('D') ? 'h6' : 'subtitle2'} style={{ color: getColor(lastUpdated.diff) }}>
          {lastUpdated.str}
        </Typography>
        <Typography variant="subtitle2">
          ~{pokemon_avg} {t('spawnsPerHour')}
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <Divider style={{ color: 'white', margin: 4 }} />
      </Grid>
      <Grid item xs={12} style={{ textAlign: 'center' }}>
        {recent ? (
          <Typography variant="caption">
            {t('nestEstimated')}<br />
            {t('verifyNests')}
          </Typography>
        ) : (
          <Typography variant="caption">
            {t('nestOutOfDate')}<br />
            {t('nestCheckCurrent')}
          </Typography>
        )}
      </Grid>
    </Grid>
  )
}

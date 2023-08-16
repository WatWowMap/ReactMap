import React, { useState, useEffect } from 'react'
import MoreVert from '@mui/icons-material/MoreVert'
import {
  Grid,
  Typography,
  IconButton,
  Divider,
  Menu,
  MenuItem,
  Button,
} from '@mui/material'

import { useTranslation } from 'react-i18next'

import { useStore, useStatic, useLayoutStore } from '@hooks/useStore'
import Utility from '@services/Utility'
import ErrorBoundary from '@components/ErrorBoundary'
import NestSubmission from '@components/layout/dialogs/NestSubmission'

const getColor = (timeSince) => {
  let color = 'success'
  if (timeSince > 604800) {
    color = '#ffeb3b'
  }
  if (timeSince > 1209600) {
    color = 'error'
  }
  return color
}

export default function NestPopup({ nest, iconUrl, pokemon, recent }) {
  const { t } = useTranslation()
  const { perms, loggedIn } = useStatic((s) => s.auth)

  const [parkName, setParkName] = useState(true)
  const [anchorEl, setAnchorEl] = useState(false)

  const {
    id = '0',
    name = '',
    updated = 0,
    pokemon_avg = 0,
    submitted_by = '',
  } = nest

  const lastUpdated = Utility.getTimeUntil(new Date(updated * 1000))

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleHide = () => {
    setAnchorEl(null)
    useStatic.setState((prev) => ({ hideList: [...prev.hideList, id] }))
  }

  const handleExclude = () => {
    setAnchorEl(null)
    const key = `${pokemon.pokemon_id}-${pokemon.pokemon_form}`
    useStore.setState((prev) => ({
      filters: {
        ...prev.filters,
        nests: {
          ...prev.filters.nests,
          filter: {
            ...prev.filters.nests.filter,
            [key]: {
              ...prev.filters.nests.filter[key],
              enabled: false,
            },
          },
        },
      },
    }))
    useStatic.setState((prev) => ({ excludeList: [...prev.excludeList, key] }))
  }

  const options = [
    { name: 'hide', action: handleHide },
    { name: 'exclude', action: handleExclude },
  ]
  useEffect(() => {
    Utility.analytics('Popup', `Name: ${name} Pokemon: ${pokemon}`, 'Nest')
  }, [])

  return (
    <ErrorBoundary noRefresh style={{}} variant="h5">
      <Grid
        container
        justifyContent="center"
        alignItems="center"
        style={{ width: 200 }}
        spacing={1}
      >
        <Grid item xs={9} style={{ textAlign: 'center' }}>
          <Typography
            variant={name.length > 20 ? 'subtitle2' : 'h6'}
            align="center"
            noWrap={parkName}
            onClick={() => setParkName(!parkName)}
          >
            {name}
          </Typography>
          {submitted_by && (
            <Typography
              variant="caption"
              fontSize={10}
              noWrap={parkName}
              onClick={() => setParkName(!parkName)}
            >
              {t('submitted_by')}: {submitted_by}
            </Typography>
          )}
        </Grid>
        <Grid item xs={3}>
          <IconButton aria-haspopup="true" onClick={handleClick} size="large">
            <MoreVert />
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
            alt={iconUrl}
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
          <Typography variant="subtitle2">{t('last_updated')}</Typography>
          <Typography
            variant={lastUpdated.str.includes('D') ? 'h6' : 'subtitle2'}
            color={getColor(lastUpdated.diff)}
          >
            {lastUpdated.str
              .replace('days', t('days'))
              .replace('day', t('day'))}
          </Typography>
          <Typography variant="subtitle2">
            ~{pokemon_avg} {t('spawns_per_hour')}
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <Divider style={{ margin: 4 }} />
        </Grid>
        <Grid item xs={12} style={{ textAlign: 'center' }}>
          {recent ? (
            <Typography variant="caption">
              {t('nest_estimated')}
              <br />
              {t('verify_nests')}
            </Typography>
          ) : (
            <Typography variant="caption">
              {t('nest_out_of_date')}
              <br />
              {t('nest_check_current')}
            </Typography>
          )}
        </Grid>
        <Grid item xs={12} style={{ textAlign: 'center' }}>
          <Button
            color="secondary"
            variant="contained"
            disabled={!perms.nestSubmissions || !loggedIn}
            onClick={() => useLayoutStore.setState({ nestSubmissions: id })}
          >
            {t('submit_nest_name')}
          </Button>
        </Grid>
      </Grid>
      <NestSubmission {...nest} />
    </ErrorBoundary>
  )
}

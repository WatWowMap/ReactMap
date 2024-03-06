// @ts-check
import React, { useState, useEffect } from 'react'
import MoreVert from '@mui/icons-material/MoreVert'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import Button from '@mui/material/Button'
import { useTranslation } from 'react-i18next'

import { useMemory } from '@store/useMemory'
import { useLayoutStore } from '@store/useLayoutStore'
import { setDeepStore } from '@store/useStorage'
import { Utility } from '@services/Utility'
import { ErrorBoundary } from '@components/ErrorBoundary'
import { NestSubmission } from '@components/dialogs/NestSubmission'

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

/**
 *
 * @param {import('@rm/types').Nest & {
 *  recent: boolean,
 *  iconUrl: string
 * }} props
 * @returns
 */
export function NestPopup({
  recent,
  iconUrl,
  pokemon_id,
  pokemon_form,
  id,
  name = '',
  updated = 0,
  pokemon_avg = 0,
  submitted_by = '',
}) {
  const { t } = useTranslation()
  const { perms, loggedIn } = useMemory((s) => s.auth)

  const [parkName, setParkName] = useState(true)
  const [anchorEl, setAnchorEl] = useState(null)

  const lastUpdated = Utility.getTimeUntil(new Date(updated * 1000))

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleHide = () => {
    setAnchorEl(null)
    useMemory.setState((prev) => ({ hideList: new Set(prev.hideList).add(id) }))
  }

  const handleExclude = () => {
    setAnchorEl(null)
    const key = `${pokemon_id}-${pokemon_form}`
    setDeepStore(`filters.nests.filter.${key}.enabled`, false)
  }

  const options = [
    { name: 'hide', action: handleHide },
    { name: 'exclude', action: handleExclude },
  ]
  useEffect(() => {
    Utility.analytics('Popup', `Name: ${name} Pokemon: ${pokemon_id}`, 'Nest')
  }, [])

  return (
    <ErrorBoundary noRefresh variant="h5">
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
          open={!!anchorEl}
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
          <Typography variant="caption">{t(`poke_${pokemon_id}`)}</Typography>
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
            variant="outlined"
            size="small"
            disabled={!perms.nestSubmissions || !loggedIn}
            onClick={() =>
              useLayoutStore.setState({ nestSubmissions: `${id}` })
            }
          >
            {t('submit_nest_name')}
          </Button>
        </Grid>
      </Grid>
      <NestSubmission id={id} name={name} />
    </ErrorBoundary>
  )
}

// @ts-check
import * as React from 'react'
import MoreVert from '@mui/icons-material/MoreVert'
import Grid from '@mui/material/Unstable_Grid2'
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
import { getTimeUntil } from '@utils/getTimeUntil'
import { useAnalytics } from '@hooks/useAnalytics'
import { Navigation } from '@components/popups/Navigation'

/** @param {number} timeSince */
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
  lat,
  lon,
}) {
  const { t } = useTranslation()
  const submissionPerm = useMemory((s) => s.auth.perms.nestSubmissions)

  const [parkName, setParkName] = React.useState(true)
  const [anchorEl, setAnchorEl] = React.useState(null)

  const lastUpdated = getTimeUntil(updated * 1000)

  const handleClick = (event) => setAnchorEl(event.currentTarget)
  const handleClose = () => setAnchorEl(null)
  const handleHide = () => {
    setAnchorEl(null)
    useMemory.setState((prev) => ({ hideList: new Set(prev.hideList).add(id) }))
  }

  const handleExclude = () => {
    setAnchorEl(null)
    const key = `${pokemon_id}-${pokemon_form}`
    setDeepStore(`filters.nests.filter.${key}.enabled`, false)
  }

  useAnalytics('Popup', `Name: ${name} Pokemon: ${pokemon_id}`, 'Nest')

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
      <Grid xs={pokemon_id ? 9 : 12} textAlign="center">
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
      {!!pokemon_id && (
        <Grid xs={3}>
          <IconButton aria-haspopup="true" onClick={handleClick} size="large">
            <MoreVert />
          </IconButton>
        </Grid>
      )}
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
      {!!pokemon_id && (
        <Grid xs={6} textAlign="center">
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
      )}
      <Grid xs={pokemon_id ? 6 : 12} textAlign="center">
        <Typography variant="subtitle2">{t('last_updated')}</Typography>
        <Typography
          variant={lastUpdated.str.includes('D') ? 'h6' : 'subtitle2'}
          color={getColor(lastUpdated.diff)}
        >
          {lastUpdated.str.replace('days', t('days')).replace('day', t('day'))}
        </Typography>
        <Typography variant="subtitle2">
          ~{pokemon_avg?.toFixed(2) || 0} {t('spawns_per_hour')}
        </Typography>
      </Grid>
      <Grid xs={12}>
        <Divider style={{ margin: 4 }} />
      </Grid>
      <Grid xs={12} textAlign="center">
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
      {submissionPerm && (
        <Grid xs={9} textAlign="center">
          <Button
            color="secondary"
            variant="outlined"
            size="small"
            onClick={() =>
              useLayoutStore.setState({
                nestSubmissions: {
                  id: `${id}`,
                  name: `${name}`,
                },
              })
            }
          >
            <Typography variant="caption">{t('submit_nest_name')}</Typography>
          </Button>
        </Grid>
      )}
      <Grid
        xs={submissionPerm ? 3 : 12}
        container
        alignItems="center"
        justifyContent="center"
      >
        <Navigation lat={lat} lon={lon} />
      </Grid>
    </Grid>
  )
}

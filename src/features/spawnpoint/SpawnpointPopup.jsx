// @ts-check
import * as React from 'react'
import Typography from '@mui/material/Typography'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import { useTranslation } from 'react-i18next'

import { useMemory } from '@store/useMemory'
import { ErrorBoundary } from '@components/ErrorBoundary'
import { dayCheck } from '@utils/dayCheck'

/**
 *
 * @param {import('@rm/types').Spawnpoint} props
 * @returns
 */
export function SpawnpointPopup({ id, despawn_sec, lat, lon, updated }) {
  const { t } = useTranslation()
  const { perms } = useMemory((s) => s.auth)

  const [anchorEl, setAnchorEl] = React.useState(null)

  const minute = despawn_sec > 60 ? Math.round(despawn_sec / 60) : despawn_sec
  const minuteFixed = minute < 10 ? `0${minute}` : minute

  const handleClose = () => {
    setAnchorEl(null)
  }

  const copyId = () => {
    setAnchorEl(null)
    navigator.clipboard.writeText(id)
  }

  const options = []

  if (perms.admin) {
    options.push({ name: 'Copy ID', action: copyId })
  }

  return (
    <ErrorBoundary noRefresh style={{}} variant="h5">
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
      <Typography variant="h5" align="center">
        {t('spawnpoint')}
      </Typography>
      <Typography variant="h6" align="center">
        {despawn_sec ? `00:${minuteFixed}` : '?'}
      </Typography>
      <Typography variant="subtitle1" align="center">
        {t('last_updated')}
      </Typography>
      <Typography variant="subtitle2" align="center">
        {dayCheck(Date.now() / 1000, updated)}
      </Typography>
      <br />
      <Typography variant="subtitle1" align="center">
        {t('location')}
      </Typography>
      <Typography variant="subtitle2" align="center">
        {lat},<br />
        {lon}
      </Typography>
    </ErrorBoundary>
  )
}

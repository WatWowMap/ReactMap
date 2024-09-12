// @ts-check
import * as React from 'react'
import Typography from '@mui/material/Typography'
import MenuItem from '@mui/material/MenuItem'
import { useTranslation } from 'react-i18next'

/**
 *
 * @param {{ lat: number, lon: number }} props
 * @returns
 */
export function Coords({ lat, lon }) {
  return (
    <Typography variant="caption" textAlign="center">
      🎯 {lat}, {lon}
    </Typography>
  )
}

export function CopyCoords({ lat, lon }) {
  const { t } = useTranslation()

  const copy = React.useCallback(
    () => navigator.clipboard.writeText(`${lat}, ${lon}`),
    [lat, lon],
  )

  return (
    <MenuItem dense onClick={copy}>
      {t('copy_coordinates')}
    </MenuItem>
  )
}

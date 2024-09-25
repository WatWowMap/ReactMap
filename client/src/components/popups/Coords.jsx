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

/**
 *
 * @param {{ lat: number, lon: number } & import('@mui/material').MenuItemProps} props
 * @returns
 */
export function CopyCoords({ lat, lon, onClick, ...props }) {
  const { t } = useTranslation()

  const onClickWithCopy = React.useCallback(
    (/** @type {React.MouseEvent<HTMLLIElement, MouseEvent>} */ e) => {
      navigator.clipboard.writeText(`${lat}, ${lon}`)
      if (onClick) onClick(e)
    },
    [lat, lon, onClick],
  )

  return (
    <MenuItem dense onClick={onClickWithCopy} {...props}>
      {t('copy_coordinates')}
    </MenuItem>
  )
}

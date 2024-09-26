import * as React from 'react'
import Typography from '@mui/material/Typography'
import MenuItem, { MenuItemProps } from '@mui/material/MenuItem'
import { useTranslation } from 'react-i18next'

interface Props {
  lat: number | string
  lon: number | string
}

export function Coords({ lat, lon }: Props) {
  return (
    <Typography variant="caption" textAlign="center">
      🎯 {lat}, {lon}
    </Typography>
  )
}

export function CopyCoords({
  lat,
  lon,
  onClick,
  ...props
}: Props & import('@mui/material').MenuItemProps) {
  const { t } = useTranslation()

  const onClickWithCopy: MenuItemProps['onClick'] = React.useCallback(
    (e) => {
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

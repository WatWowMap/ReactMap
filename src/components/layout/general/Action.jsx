import React from 'react'
import {
  IconButton, Button, Typography, useMediaQuery,
} from '@material-ui/core'
import { useTheme } from '@material-ui/styles'
import * as MuiIcons from '@material-ui/icons'
import { useTranslation } from 'react-i18next'

export default function Action({
  name, action, icon, color,
}) {
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.only('xs'))

  const MuiIcon = MuiIcons[icon]
  const muiColor = color === 'primary' || color === 'secondary'

  return isMobile ? (
    <IconButton
      onClick={action}
    >
      <MuiIcon
        color={muiColor ? color : 'inherit'}
        style={{ color: muiColor ? null : color }}
      />
    </IconButton>
  ) : (
    <Button
      onClick={action}
      color={muiColor ? color : 'inherit'}
      style={{ color: muiColor ? null : color }}
    >
      <Typography
        variant="caption"
      >
        {t(name)}
      </Typography>
    </Button>
  )
}

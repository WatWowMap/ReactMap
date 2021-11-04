import React from 'react'
import {
  IconButton, Button, Typography, useMediaQuery, Grid,
} from '@material-ui/core'
import { useTheme } from '@material-ui/styles'
import * as MuiIcons from '@material-ui/icons'
import { useTranslation } from 'react-i18next'

import useStyles from '@hooks/useStyles'

export default function Footer({ options, role }) {
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.only('xs'))
  const classes = useStyles()

  const capitalizeFirstChar = str => `${str.charAt(0).toUpperCase()}${str.substring(1)}`
  const gridNum = Math.floor(12 / options.length)

  return (
    <Grid
      className={classes.filterFooter}
      container
      justifyContent="flex-end"
      alignItems="center"
    >
      {options.map(button => {
        const MuiIcon = button.icon ? MuiIcons[button.icon] : null
        const color = button.disabled ? 'default' : button.color || 'white'
        const muiColor = color === 'primary' || color === 'secondary'
        const key = button.key || button.name
        return (
          <Grid item xs={isMobile ? gridNum : t(`${role}${capitalizeFirstChar(key)}Width`, gridNum)} key={key} style={{ textAlign: button.align || 'center' }}>
            {isMobile && MuiIcon ? (
              <IconButton
                onClick={button.action}
                disabled={button.disabled}
              >
                <MuiIcon
                  color={muiColor ? color : 'inherit'}
                  style={{ color: muiColor ? null : color }}
                />
              </IconButton>
            ) : (
              <Button
                onClick={button.action}
                color={muiColor ? color : 'inherit'}
                style={{ color: muiColor ? null : color }}
                disabled={button.disabled}
              >
                {!button.mobileOnly && (
                  <Typography
                    variant="caption"
                  >
                    {typeof button.name === 'string' ? t(button.name) : button.name}
                  </Typography>
                )}
              </Button>
            )}
          </Grid>
        )
      })}
    </Grid>
  )
}

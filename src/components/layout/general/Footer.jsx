import React from 'react'
import {
  IconButton, Button, Typography, useMediaQuery, Grid,
} from '@material-ui/core'
import { useTheme } from '@material-ui/styles'
import * as MuiIcons from '@material-ui/icons'
import { useTranslation } from 'react-i18next'

import useStyles from '@hooks/useStyles'

export default function Footer({ options }) {
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.only('xs'))
  const classes = useStyles()

  return (
    <Grid
      className={classes.filterFooter}
      container
      justifyContent={isMobile ? 'center' : 'flex-end'}
      alignItems="center"
    >
      {options.map(button => {
        const MuiIcon = MuiIcons[button.icon]
        const muiColor = button.color === 'primary' || button.color === 'secondary'
        return (
          <Grid item xs={4} key={button.name}>
            {isMobile ? (
              <IconButton
                onClick={button.action}
              >
                <MuiIcon
                  color={muiColor ? button.color : 'inherit'}
                  style={{ color: muiColor ? null : button.color }}
                />
              </IconButton>
            ) : (
              <Button
                onClick={button.action}
                color={muiColor ? button.color : 'inherit'}
                style={{ color: muiColor ? null : button.color }}
              >
                <Typography
                  variant="caption"
                >
                  {t(button.name)}
                </Typography>
              </Button>
            )}
          </Grid>
        )
      })}
    </Grid>
  )
}

import React from 'react'
import {
  IconButton,
  Button,
  Typography,
  useMediaQuery,
  Grid,
} from '@mui/material'
import { useTheme } from '@mui/styles'
import { useTranslation } from 'react-i18next'

import useStyles from '@hooks/useStyles'

import * as MuiIcons from './Icons'

export default function Footer({ options, role }) {
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.only('xs'))
  const classes = useStyles()

  return (
    <Grid
      className={classes.filterFooter}
      container
      justifyContent="flex-end"
      alignItems="center"
      style={{ minHeight: 50 }}
    >
      {options.map((button) => {
        const key = button.key || button.name
        const actualSize = button.size || Math.floor(12 / options.length)
        if (button.component) {
          return (
            <Grid
              item
              key={button.key}
              xs={actualSize}
              style={{ textAlign: button.align || 'center' }}
            >
              {button.component}
            </Grid>
          )
        }
        const MuiIcon = button.icon ? MuiIcons[button.icon] : null
        const color = button.disabled ? 'default' : button.color || 'white'
        const muiColor = color === 'primary' || color === 'secondary'
        return (
          <Grid
            item
            xs={isMobile ? actualSize : +t(`${role}_key_width`) || actualSize}
            key={key}
            style={{ textAlign: button.align || 'center' }}
          >
            {isMobile && MuiIcon ? (
              <IconButton
                href={button.link || undefined}
                rel={button.link ? 'noreferrer' : undefined}
                target={button.link ? button.target || '_blank' : undefined}
                onClick={button.action || undefined}
                disabled={button.disabled}
                size="large"
              >
                <MuiIcon
                  color={muiColor ? color : 'inherit'}
                  style={{ color: muiColor ? null : color }}
                />
              </IconButton>
            ) : (
              <Button
                href={button.link}
                rel={button.link ? 'noreferrer' : undefined}
                target={button.link ? button.target || '_blank' : undefined}
                onClick={button.action}
                color={muiColor ? color : 'inherit'}
                style={{ color: muiColor ? null : color }}
                disabled={button.disabled}
              >
                {!button.mobileOnly && (
                  <Typography variant="caption">
                    {typeof button.name === 'string'
                      ? t(button.name)
                      : button.name}
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

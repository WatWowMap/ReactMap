/* eslint-disable no-nested-ternary */
import React from 'react'
import { IconButton, Button, Typography, Grid } from '@mui/material'
import { useTranslation } from 'react-i18next'

import * as MuiIcons from './Icons'

export default function Footer({ options, role }) {
  const { t } = useTranslation()

  return (
    <Grid
      container
      justifyContent="flex-end"
      alignItems="center"
      sx={(theme) => ({
        minHeight: 50,
        borderTop: `1px solid ${theme.palette.divider}`,
      })}
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
        const color = button.disabled ? 'default' : button.color
        const muiColor = ['primary', 'secondary', 'success', 'error'].includes(
          color,
        )
        const [first, second] = color ? color.split('.') : ['inherit']

        console.log({ first, second })
        return (
          <Grid
            item
            xs={actualSize}
            sm={+t(`${role}_key_width`) || actualSize}
            key={key}
            style={{
              textAlign: button.align || 'center',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {MuiIcon && (
              <IconButton
                href={button.link || undefined}
                rel={button.link ? 'noreferrer' : undefined}
                target={button.link ? button.target || '_blank' : undefined}
                onClick={button.action || undefined}
                disabled={button.disabled}
                sx={{ display: { xs: 'block', sm: 'none' } }}
                size="large"
              >
                <MuiIcon
                  color={muiColor ? color : 'inherit'}
                  sx={(theme) => ({
                    color: muiColor
                      ? null
                      : second
                      ? theme.palette[first][second]
                      : first,
                  })}
                />
              </IconButton>
            )}
            <Button
              href={button.link}
              rel={button.link ? 'noreferrer' : undefined}
              target={button.link ? button.target || '_blank' : undefined}
              onClick={button.action}
              color={muiColor ? color : 'inherit'}
              disabled={button.disabled}
              sx={(theme) => ({
                display: {
                  xs: 'none',
                  sm: button.mobileOnly ? 'none' : 'block',
                },
                color: muiColor
                  ? null
                  : second
                  ? theme.palette[first][second]
                  : first,
              })}
            >
              <Typography variant="caption">
                {typeof button.name === 'string' ? t(button.name) : button.name}
              </Typography>
            </Button>
          </Grid>
        )
      })}
    </Grid>
  )
}

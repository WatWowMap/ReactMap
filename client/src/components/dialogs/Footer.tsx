import * as React from 'react'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Unstable_Grid2'
import Replay from '@mui/icons-material/Replay'
import Save from '@mui/icons-material/Save'
import Add from '@mui/icons-material/Add'
import People from '@mui/icons-material/People'
import BugReport from '@mui/icons-material/BugReport'
import Help from '@mui/icons-material/HelpOutline'
import Ballot from '@mui/icons-material/Ballot'
import Tune from '@mui/icons-material/Tune'
import FormatSize from '@mui/icons-material/FormatSize'
import Clear from '@mui/icons-material/Clear'
import Check from '@mui/icons-material/Check'
import { useTranslation } from 'react-i18next'
import { ButtonBaseProps } from '@mui/material'

const MuiIcons = {
  Replay,
  Save,
  Add,
  People,
  BugReport,
  Help,
  Ballot,
  Tune,
  FormatSize,
  Clear,
  Check,
}

export interface FooterButton {
  key?: string
  name?: string
  icon?: keyof typeof MuiIcons
  color?: import('@mui/material').ButtonProps['color']
  disabled?: boolean
  link?: string
  target?: string
  action?: ButtonBaseProps['onClick']
  component?: React.ReactNode
  size?: number
  align?: 'left' | 'center' | 'right'
  mobileOnly?: boolean
}

export function Footer({
  options,
  i18nKey,
}: {
  options: FooterButton[]
  i18nKey?: string
}) {
  const { t } = useTranslation()

  return (
    <Grid
      container
      alignItems="center"
      justifyContent="flex-end"
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
              key={button.key}
              style={{ textAlign: button.align || 'center' }}
              xs={actualSize}
            >
              {button.component}
            </Grid>
          )
        }
        const MuiIcon = button.icon ? MuiIcons[button.icon] : null
        const color = button.disabled ? 'inherit' : button.color
        const muiColor = ['primary', 'secondary', 'success', 'error'].includes(
          color,
        )
        const [first, second] = color ? color.split('.') : ['inherit']

        return (
          <Grid
            key={key}
            className="flex-center"
            sm={+t(`${i18nKey}_key_width`) || actualSize}
            textAlign={button.align || 'center'}
            xs={actualSize}
          >
            {MuiIcon && (
              <IconButton
                disabled={button.disabled}
                href={button.link || undefined}
                rel={button.link ? 'noreferrer' : undefined}
                size="large"
                sx={{ display: { xs: 'block', sm: 'none' } }}
                target={button.link ? button.target || '_blank' : undefined}
                onClick={button.action || undefined}
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
              color={muiColor ? color : 'inherit'}
              disabled={button.disabled}
              href={button.link}
              rel={button.link ? 'noreferrer' : undefined}
              sx={(theme) => ({
                display: {
                  xs: MuiIcon ? 'none' : 'block',
                  sm: button.mobileOnly ? 'none' : 'block',
                },
                color: muiColor
                  ? null
                  : second
                    ? theme.palette[first][second]
                    : first,
              })}
              target={button.link ? button.target || '_blank' : undefined}
              onClick={button.action}
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

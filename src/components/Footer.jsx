// @ts-check
import * as React from 'react'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
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

/**
 * @typedef {{
 *    key?: string,
 *    name?: string,
 *    icon?: keyof typeof MuiIcons,
 *    color?: import('@mui/material').ButtonProps['color'],
 *    disabled?: boolean,
 *    link?: string,
 *    target?: string,
 *    action?: () => void,
 *    component?: React.ReactNode,
 *    size?: number,
 *    align?: 'left' | 'center' | 'right',
 *    mobileOnly?: boolean,
 * }} FooterButton
 */

/**
 *
 * @param {{
 *  options: FooterButton[],
 * role?: string,
 * }} props
 * @returns
 */
export default function Footer({ options, role }) {
  const { t } = useTranslation()

  return (
    <Grid
      container
      justifyContent="flex-end"
      alignItems="center"
      sx={(theme) => ({
        minHeight: { xs: 'inherit', sm: 50 },
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
        const color = button.disabled ? 'inherit' : button.color
        const muiColor = ['primary', 'secondary', 'success', 'error'].includes(
          color,
        )
        const [first, second] = color ? color.split('.') : ['inherit']

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
                  xs: MuiIcon ? 'none' : 'block',
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

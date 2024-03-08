// @ts-check
import * as React from 'react'
import Collapse from '@mui/material/Collapse'
import Grid from '@mui/material/Unstable_Grid2'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import ExpandMore from '@mui/icons-material/ExpandMore'

import { useStorage } from '@store/useStorage'

import { TimeSince } from './Timer'
import { NameTT } from './NameTT'

/**
 *
 * @param {{
 *  expireTime: number
 *  icon?: string | React.ReactNode
 *  until?: boolean
 *  size?: number
 *  tt?: string[] | string
 *  expandKey?: string
 *  caption?: string
 *  children?: React.ReactNode
 *  disabled?: string
 * }} param0
 * @returns
 */
export function TimeTile({
  expireTime,
  icon,
  until,
  size = 3,
  tt = [],
  expandKey,
  caption,
  children,
  disabled = '',
}) {
  const endTime = new Date(expireTime * 1000)
  const expanded = useStorage((s) => !!s.popups[expandKey])

  return (
    <>
      {icon && (
        <Grid xs={size} textAlign="center">
          {typeof icon === 'string' ? (
            <NameTT id={disabled || tt}>
              <img
                src={icon}
                className={`quest-popup-img ${disabled ? 'disable-image' : ''}`}
                alt={icon}
              />
            </NameTT>
          ) : (
            icon
          )}
          {caption && (
            <Typography
              variant="caption"
              className="ar-task"
              noWrap
              color={disabled ? 'GrayText' : 'inherit'}
            >
              {caption}
            </Typography>
          )}
        </Grid>
      )}
      {endTime && (
        <Grid
          xs={icon ? (children ? 10 : 12) - size : children ? 10 : 12}
          textAlign="center"
        >
          <TimeSince
            expireTime={expireTime}
            until={until}
            color={disabled ? 'GrayText' : 'inherit'}
          />
          <Typography
            variant="caption"
            color={disabled ? 'GrayText' : 'inherit'}
          >
            {new Date(endTime).toLocaleTimeString(
              localStorage.getItem('i18nextLng') || 'en',
            )}
          </Typography>
        </Grid>
      )}
      {expandKey && children && (
        <>
          <Grid xs={2}>
            <IconButton
              disabled={!!disabled}
              className={expanded ? 'expanded' : 'closed'}
              onClick={() =>
                useStorage.setState((prev) => ({
                  popups: { ...prev.popups, [expandKey]: !expanded },
                }))
              }
              size="large"
            >
              <ExpandMore />
            </IconButton>
          </Grid>
          <Collapse timeout="auto" unmountOnExit in={expanded}>
            {children}
          </Collapse>
        </>
      )}
    </>
  )
}

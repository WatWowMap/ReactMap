// @ts-check
import * as React from 'react'
import { Collapse, Grid, IconButton, Typography } from '@mui/material'
import ExpandMore from '@mui/icons-material/ExpandMore'

import { useStore } from '@hooks/useStore'

import Timer from './Timer'
import NameTT from './NameTT'

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
export default function TimeTile({
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
  const expanded = useStore((state) => !!state.popups[expandKey])

  return (
    <>
      {icon && (
        <Grid item xs={size} style={{ textAlign: 'center' }}>
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
          item
          xs={icon ? (children ? 10 : 12) - size : children ? 10 : 12}
          style={{ textAlign: 'center' }}
        >
          <Timer
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
          <Grid item xs={2}>
            <IconButton
              disabled={!!disabled}
              className={expanded ? 'expanded' : 'closed'}
              onClick={() =>
                useStore.setState((prev) => ({
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

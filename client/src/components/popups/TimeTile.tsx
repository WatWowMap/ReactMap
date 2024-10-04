// @ts-check
import * as React from 'react'
import Collapse from '@mui/material/Collapse'
import Grid from '@mui/material/Unstable_Grid2'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import ExpandMore from '@mui/icons-material/ExpandMore'
import { useStorage } from '@store/useStorage'

import { Timer } from './Timer'
import { NameTT } from './NameTT'

export function TimeTile({
  expireTime,
  icon,
  size = 3,
  tt = [],
  expandKey,
  caption,
  children,
  disabled = '',
}: {
  expireTime: number
  icon?: string | React.ReactNode
  size?: number
  tt?: string[] | string
  expandKey?: string
  caption?: string
  children?: React.ReactNode
  disabled?: string
}) {
  const endTime = new Date(expireTime * 1000)
  const expanded = useStorage((s) => !!s.popups[expandKey])

  return (
    <>
      {icon && (
        <Grid textAlign="center" xs={size}>
          {typeof icon === 'string' ? (
            <NameTT title={disabled || tt}>
              <img
                alt={icon}
                className={`quest-popup-img ${disabled ? 'disable-image' : ''}`}
                src={icon}
              />
            </NameTT>
          ) : (
            icon
          )}
          {caption && (
            <Typography
              noWrap
              className="ar-task"
              color={disabled ? 'GrayText' : 'inherit'}
              variant="caption"
            >
              {caption}
            </Typography>
          )}
        </Grid>
      )}
      {endTime && (
        <Grid
          textAlign="center"
          xs={icon ? (children ? 10 : 12) - size : children ? 10 : 12}
        >
          <Timer
            color={disabled ? 'GrayText' : 'inherit'}
            expireTime={expireTime}
          />
          <Typography
            color={disabled ? 'GrayText' : 'inherit'}
            variant="caption"
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
              className={expanded ? 'expanded' : 'closed'}
              disabled={!!disabled}
              size="large"
              onClick={() =>
                useStorage.setState((prev) => ({
                  popups: { ...prev.popups, [expandKey]: !expanded },
                }))
              }
            >
              <ExpandMore />
            </IconButton>
          </Grid>
          <Collapse unmountOnExit in={expanded} timeout="auto">
            {children}
          </Collapse>
        </>
      )}
    </>
  )
}

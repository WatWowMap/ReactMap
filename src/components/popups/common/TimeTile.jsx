/* eslint-disable no-nested-ternary */
import React from 'react'
import { Collapse, Grid, IconButton, Typography } from '@material-ui/core'
import ExpandMore from '@material-ui/icons/ExpandMore'

import { useStore } from '@hooks/useStore'
import useStyles from '@hooks/useStyles'

import Timer from './Timer'
import NameTT from './NameTT'

export default function TimeTile({
  expireTime,
  icon,
  until,
  size = 3,
  tt = [],
  expandKey,
  caption,
  children,
}) {
  const endTime = new Date(expireTime * 1000)
  const expanded = useStore((state) => !!state.popups[expandKey])
  const classes = useStyles()

  return (
    <>
      {icon && (
        <Grid item xs={size} style={{ textAlign: 'center' }}>
          {typeof icon === 'string' ? (
            <NameTT id={tt}>
              <img src={icon} className="quest-popup-img" alt={icon} />
            </NameTT>
          ) : (
            icon
          )}
          {caption && (
            <Typography variant="caption" className="ar-task" noWrap>
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
          <Timer expireTime={expireTime} until={until} />
          <Typography variant="caption">
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
              className={expanded ? classes.expandOpen : classes.expand}
              style={{ color: 'white' }}
              onClick={() =>
                useStore.setState((prev) => ({
                  popups: { ...prev.popups, [expandKey]: !expanded },
                }))
              }
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

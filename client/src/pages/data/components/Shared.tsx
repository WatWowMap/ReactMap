// @ts-check
import * as React from 'react'
import Grid from '@mui/material/Unstable_Grid2'
import Divider from '@mui/material/Divider'
import List from '@mui/material/List'
import ListSubheader from '@mui/material/ListSubheader'
import { styled } from '@mui/material/styles'
import { BasicListButton } from '@components/inputs/BasicListButton'
import { StatusIcon } from '@components/StatusIcon'

import { setNotification, useDataManagementStore } from '../hooks/store'

export const StyledDivider = styled(Divider)(({ theme }) => ({
  margin: theme.spacing(1, 0),
  borderColor: 'ActiveBorder',
}))

export const StyledSubHeader = styled(ListSubheader)(({ theme }) => ({
  color: theme.palette.secondary.main,
  fontSize: '1.5rem',
}))

export const BORDER_SX = /** @type {import('@mui/material').SxProps} */ {
  border: 'ActiveBorder 2px solid',
  borderRadius: 4,
  p: 2,
  width: '100%',
  m: 2,
}

export function ChildContainer({ children }: { children: React.ReactNode }) {
  return (
    <Grid container sm={6} xs={12}>
      <List sx={BORDER_SX}>{children}</List>
    </Grid>
  )
}

export function ButtonWithNotification({
  label,
  category,
  all,
  onClick,
  isHovering,
  ...props
}: {
  label?: string
  isHovering?: boolean
  all?: boolean
  category?: import('../hooks/store').DataCategory
} & import('@mui/material').ListItemButtonProps) {
  const hasBeenReset = useDataManagementStore(
    (s) => !!(s.resetList[label] || s.resetList[category] || s.resetList.all),
  )
  const fullOnClick: import('@mui/material').ListItemButtonProps['onClick'] =
    React.useCallback(
      (e) => {
        if (onClick) onClick(e)
        setNotification(label, all ? category : '')
      },
      [onClick, label, category, all],
    )

  return (
    <BasicListButton
      label={label}
      sx={{ bgcolor: isHovering ? 'rgba(255, 255, 255, 0.08)' : 'inherit' }}
      onClick={fullOnClick}
      {...props}
    >
      <StatusIcon status={hasBeenReset} />
    </BasicListButton>
  )
}

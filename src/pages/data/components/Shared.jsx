// @ts-check
import * as React from 'react'
import Grid from '@mui/material/Unstable_Grid2'
import Divider from '@mui/material/Divider'
import List from '@mui/material/List'
import ListSubheader from '@mui/material/ListSubheader'
import { styled } from '@mui/material/styles'
import CheckIcon from '@mui/icons-material/Check'
import ClearIcon from '@mui/icons-material/Clear'

import { BasicListButton } from '@components/general/BasicListButton'

import { setNotification, useDataManagementStore } from '../hooks/store'

export const StyledDivider = styled(Divider)(({ theme }) => ({
  margin: theme.spacing(1, 0),
  borderColor: 'ActiveBorder',
}))

export const StyledSubHeader = styled(ListSubheader)(({ theme }) => ({
  color: theme.palette.secondary.main,
  fontSize: '1.5rem',
}))

export const BORDER_SX = /** @type {import('@mui/material').SxProps} */ ({
  border: 'ActiveBorder 2px solid',
  borderRadius: 4,
  p: 2,
  width: '100%',
  m: 2,
})

/**
 *
 * @param {{ children: React.ReactNode }} props
 * @returns
 */
export function ChildContainer({ children }) {
  return (
    <Grid container xs={12} sm={6}>
      <List sx={BORDER_SX}>{children}</List>
    </Grid>
  )
}

/**
 * @param {{
 *  label?: string,
 *  isHovering?: boolean,
 *  all?: boolean
 *  category?: import('../hooks/store').DataCategory
 * } & import('@mui/material').ListItemButtonProps} props
 */
export function ButtonWithNotification({
  label,
  category,
  all,
  onClick,
  isHovering,
  ...props
}) {
  const hasBeenReset = useDataManagementStore(
    (s) => !!(s.resetList[label] || s.resetList[category] || s.resetList.all),
  )
  /** @type {import('@mui/material').ListItemButtonProps['onClick']} */
  const fullOnClick = React.useCallback(
    (e) => {
      if (onClick) onClick(e)
      setNotification(label, all ? category : '')
    },
    [onClick, label, category, all],
  )
  return (
    <BasicListButton
      onClick={fullOnClick}
      label={label}
      sx={{ bgcolor: isHovering ? 'rgba(255, 255, 255, 0.08)' : 'inherit' }}
      {...props}
    >
      {hasBeenReset ? (
        <CheckIcon color="success" />
      ) : (
        <ClearIcon color="error" />
      )}
    </BasicListButton>
  )
}

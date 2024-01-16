// @ts-check
import * as React from 'react'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import { useTranslation } from 'react-i18next'

/**
 * @param {{ label?: string } & import('@mui/material').ListItemButtonProps} props
 */
export function BasicListButton({ children, label, ...props }) {
  const { t } = useTranslation()
  return (
    <ListItem disablePadding>
      <ListItemButton {...props}>
        {children && <ListItemIcon>{children}</ListItemIcon>}
        {label && <ListItemText primary={t(label)} />}
      </ListItemButton>
    </ListItem>
  )
}

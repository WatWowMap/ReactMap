// @ts-check
import * as React from 'react'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import { useTranslation } from 'react-i18next'

/**
 * @template {React.ElementType} [T="div"]
 * @param {import('@mui/material').ListItemButtonProps<T, { label?: string }> & { component?: T }} props
 */
export function BasicListButton({ children, label, color, ...props }) {
  const { t } = useTranslation()
  return (
    <ListItem disablePadding>
      <ListItemButton {...props}>
        {children && <ListItemIcon>{children}</ListItemIcon>}
        {label && (
          <ListItemText primary={t(label)} primaryTypographyProps={{ color }} />
        )}
      </ListItemButton>
    </ListItem>
  )
}

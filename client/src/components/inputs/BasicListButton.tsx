// @ts-check
import * as React from 'react'
import ListItem from '@mui/material/ListItem'
import ListItemButton, {
  ListItemButtonTypeMap,
} from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import { useTranslation } from 'react-i18next'
import { TypographyProps } from '@mui/material'

export function BasicListButton<
  T extends React.ElementType = ListItemButtonTypeMap['defaultComponent'],
>({
  children,
  label,
  color,
  ...props
}: import('@mui/material').ListItemButtonProps<
  T,
  { label?: string; color?: TypographyProps['color'] }
> & {
  component?: T
}) {
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

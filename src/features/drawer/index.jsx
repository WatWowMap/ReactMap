// @ts-check
import * as React from 'react'
import Clear from '@mui/icons-material/Clear'
import List from '@mui/material/List'
import MuiDrawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ListItemIcon from '@mui/material/ListItemIcon'

import { useMemory } from '@store/useMemory'
import { useLayoutStore } from '@store/useLayoutStore'
import { Img } from '@components/Img'
import { DividerWithMargin } from '@components/StyledDivider'

import { DrawerActions } from './Actions'
import { DrawerSectionMemo } from './Section'

const handleClose = () => useLayoutStore.setState({ drawer: false })

const DrawerHeader = React.memo(
  () => {
    const title = useMemory((s) => s.config.general.title)
    return (
      <ListItem disablePadding>
        <ListItemIcon sx={{ pl: 1.5 }}>
          <Img src="/favicon.ico" alt="favicon" maxHeight={32} maxWidth={32} />
        </ListItemIcon>
        <ListItemText
          primaryTypographyProps={{
            variant: 'h5',
            color: 'secondary',
            fontWeight: 'bold',
          }}
        >
          {title}
        </ListItemText>
        <IconButton onClick={handleClose} size="large">
          <Clear />
        </IconButton>
      </ListItem>
    )
  },
  () => true,
)

const listItemSx = /** @type {import('@mui/material').SxProps} */ ({
  display: 'block',
})

export function Drawer() {
  const drawer = useLayoutStore((s) => s.drawer)
  const { config, ui } = useMemory.getState()

  return (
    <MuiDrawer
      anchor="left"
      variant="temporary"
      open={drawer}
      onClose={handleClose}
    >
      <List disablePadding sx={{ minWidth: 290 }}>
        <DrawerHeader />
        {Object.entries(ui).map(([category, value]) => (
          <React.Fragment key={category}>
            <DividerWithMargin flexItem />
            <ListItem disablePadding sx={listItemSx}>
              <DrawerSectionMemo category={category} value={value} />
            </ListItem>
          </React.Fragment>
        ))}
      </List>
      {config.general.separateDrawerActions && <DrawerActions />}
    </MuiDrawer>
  )
}

export * from './PkmnFilterHelp'

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

import { DrawerActions } from './components/Actions'
import { DrawerSectionMemo } from './components/Section'

const DrawerHeader = React.memo(
  ({ onClose }) => {
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
        <IconButton onClick={onClose} size="large">
          <Clear />
        </IconButton>
      </ListItem>
    )
  },
  (prev, next) => prev.onClose === next.onClose,
)

const listItemSx = /** @type {import('@mui/material').SxProps} */ ({
  display: 'block',
})

export function Drawer() {
  const drawer = useLayoutStore((s) => s.drawer)
  const { config, ui } = useMemory.getState()
  const paperRef = React.useRef(/** @type {HTMLDivElement | null} */ (null))
  const scrollTopRef = React.useRef(0)

  const handleScroll = React.useCallback((e) => {
    scrollTopRef.current = e.currentTarget.scrollTop
  }, [])

  const handleClose = React.useCallback(() => {
    scrollTopRef.current = paperRef.current?.scrollTop || 0
    useLayoutStore.setState({ drawer: false })
  }, [])

  const handleEnter = React.useCallback((node) => {
    node.scrollTop = scrollTopRef.current
  }, [])

  return (
    <MuiDrawer
      anchor="left"
      variant="temporary"
      open={drawer}
      onClose={handleClose}
      PaperProps={{
        ref: paperRef,
        onScroll: handleScroll,
      }}
      SlideProps={{ onEnter: handleEnter }}
    >
      <List disablePadding sx={{ minWidth: 290 }}>
        <DrawerHeader onClose={handleClose} />
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

export * from './pokemon/FilterHelp'

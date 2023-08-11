import * as React from 'react'
import Clear from '@mui/icons-material/Clear'
import { Drawer, Typography, Grid, IconButton } from '@mui/material'

import { useLayoutStore, useStatic } from '@hooks/useStore'

import Actions from './Actions'
import DrawerSection from './Section'

export default function Sidebar({ toggleDialog }) {
  const drawer = useLayoutStore((s) => s.drawer)

  const {
    config: {
      map: { title, separateDrawerActions },
    },
    ui,
  } = useStatic.getState()

  const handleClose = React.useCallback(
    () => useLayoutStore.setState({ drawer: false }),
    [],
  )

  return (
    <Drawer
      anchor="left"
      variant="temporary"
      open={drawer}
      onClose={handleClose}
    >
      <Grid container alignItems="center" style={{ flexWrap: 'nowrap' }}>
        <Grid
          item
          className="grid-item"
          style={{
            backgroundImage: 'url(/favicon.ico)',
            width: 32,
            height: 32,
            margin: 10,
          }}
        />
        <Grid item style={{ flexGrow: 1 }}>
          <Typography
            variant="h5"
            color="secondary"
            style={{
              fontWeight: 'bold',
              margin: 10,
            }}
          >
            {title}
          </Typography>
        </Grid>
        <Grid item style={{ flexGrow: 0 }}>
          <IconButton onClick={handleClose} size="large">
            <Clear />
          </IconButton>
        </Grid>
      </Grid>
      {Object.entries(ui).map(([category, value]) => (
        <DrawerSection
          key={category}
          category={category}
          value={value}
          toggleDialog={toggleDialog}
        />
      ))}
      {separateDrawerActions && <Actions />}
    </Drawer>
  )
}

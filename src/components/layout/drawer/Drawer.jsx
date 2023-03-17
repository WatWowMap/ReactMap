import React from 'react'
import Clear from '@material-ui/icons/Clear'
import { Drawer, Typography, Grid, IconButton } from '@material-ui/core'

import { useStatic } from '@hooks/useStore'
import Actions from './Actions'
import DrawerSection from './Section'

export default function Sidebar({ drawer, toggleDrawer, toggleDialog }) {
  const {
    config: {
      map: { title, separateDrawerActions },
    },
    ui,
  } = useStatic.getState()

  return (
    <Drawer
      anchor="left"
      variant="temporary"
      open={drawer}
      onClose={toggleDrawer(false)}
    >
      <Grid container alignItems="center" justifyContent="center">
        <Grid
          item
          xs={2}
          className="grid-item"
          style={{
            backgroundImage: 'url(/favicon.ico)',
            width: 32,
            height: 32,
          }}
        />
        <Grid item xs={8}>
          <Typography
            variant="h5"
            color="secondary"
            style={{
              fontWeight: 'bold',
              margin: 10,
              textShadow: '2px 2px #323232',
            }}
          >
            {title}
          </Typography>
        </Grid>
        <Grid item xs={2}>
          <IconButton onClick={toggleDrawer(false)}>
            <Clear style={{ color: 'white' }} />
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

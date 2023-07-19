import * as React from 'react'
import Clear from '@material-ui/icons/Clear'
import { Drawer, Typography, Grid, IconButton, Box } from '@material-ui/core'

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
  const [width, setWidth] = React.useState(300)

  return (
    <Drawer
      anchor="left"
      variant="temporary"
      open={drawer}
      onClose={toggleDrawer(false)}
    >
      <Grid
        container
        alignItems="center"
        style={{ flexWrap: 'nowrap' }}
        ref={(ref) => {
          const refWidth = Math.min(
            Math.max(300, ref?.clientWidth || 0),
            window.innerWidth,
          )
          return setWidth(refWidth)
        }}
      >
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
              textShadow: '2px 2px #323232',
            }}
          >
            {title}
          </Typography>
        </Grid>
        <Grid item style={{ flexGrow: 0 }}>
          <IconButton onClick={toggleDrawer(false)}>
            <Clear style={{ color: 'white' }} />
          </IconButton>
        </Grid>
      </Grid>
      <Box width={width}>
        {Object.entries(ui).map(([category, value]) => (
          <DrawerSection
            key={category}
            category={category}
            value={value}
            toggleDialog={toggleDialog}
          />
        ))}
        {separateDrawerActions && <Actions />}
      </Box>
    </Drawer>
  )
}

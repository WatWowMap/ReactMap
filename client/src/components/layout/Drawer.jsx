import React from 'react'
import clsx from 'clsx'
import { makeStyles } from '@material-ui/core/styles'
import { Drawer, Button, List, Divider, ListItem, ListItemText, Typography } from '@material-ui/core'
import { Check, Clear, ArrowForwardIos } from '@material-ui/icons'
import { ToggleButton } from '@material-ui/lab'

const useStyles = makeStyles({
  list: {
    width: 'auto',
    zIndex: 9998,
    color: '#FFFFFF',
    backgroundColor: 'rgb(51,51,51)'

  },
  drawer: {
  }
})

const DrawerMenu = ({ drawer, toggleDrawer, selected, setSelected }) => {
  const classes = useStyles()

  const filterItems = [
    { name: 'Gyms', icon: <ArrowForwardIos />, meta: 'gyms' },
    { name: 'Raids', icon: <ArrowForwardIos />, meta: 'raids' },
    { name: 'Pokestops', icon: <ArrowForwardIos />, meta: 'pokestops' },
    { name: 'Quests', icon: <ArrowForwardIos />, meta: 'quests' },
    { name: 'Invasions', icon: <ArrowForwardIos />, meta: 'invasions' },
    { name: 'Spawnpoints', icon: <ArrowForwardIos />, meta: 'spawnpoints' },
    { name: 'Pokemon', icon: <ArrowForwardIos />, meta: 'pokemon' },
    { name: 'Ingress Portals', icon: <ArrowForwardIos/>, meta: 'portals' },
    { name: 'Scan-Cells', icon: <ArrowForwardIos />, meta: 'scanCells' },
    { name: 'Wayfarer', icon: <ArrowForwardIos />, meta: 'submissionCells' },
    { name: 'Weather', icon: <ArrowForwardIos />, meta: 'weather' },
    { name: 'ScanAreas', icon: <ArrowForwardIos />, meta: 'scanAreas' },
    { name: 'Devices', icon: <ArrowForwardIos />, meta: 'devices' }
  ]

  const menuItems = [
    { name: 'Areas', icon: <ArrowForwardIos />, meta: 'areas' },
    { name: 'Stats', icon: <ArrowForwardIos />, meta: 'stats' },
    { name: 'Search', icon: <ArrowForwardIos />, meta: 'search' },
    { name: 'Settings', icon: <ArrowForwardIos />, meta: 'settings' },
    { name: 'ClearCache', icon: <ArrowForwardIos />, meta: 'clearCache' },
    { name: 'Discord', icon: <ArrowForwardIos />, meta: 'discord' },
    { name: 'Logout', icon: <ArrowForwardIos />, meta: 'logout' }
  ]

  return (
    <Drawer anchor={'left'} open={drawer} onClose={toggleDrawer(false)}>
      <div
        className={clsx(classes.list)}
        role="presentation"
        onKeyDown={toggleDrawer(false)}
      >
        <List>
          <Typography>Map Filters</Typography>
          {filterItems.map(item => {
            return (
              <ListItem button key={item.name}>
                {item.icon}
                <ListItemText primary={item.name} />
                <ToggleButton
                  value="x"
                  selected={selected[item.meta]}
                  onChange={() => {
                    setSelected({ ...selected, [item.meta]: !selected[item.meta] });
                  }}
                >
                  {selected[item.meta] ? <Check style={{ fontSize: 15, color: 'green' }} /> : <Clear style={{ fontSize: 15, color: 'red' }} />}

                </ToggleButton>
              </ListItem>
            )
          })}
        </List>
        <Divider />
        <List>
          <ListItem>
            <Button variant="contained" color="secondary">
              Import
          </Button>&nbsp;&nbsp;&nbsp;
          <Button variant="contained" color="primary">
              Export
          </Button>
          </ListItem>
        </List>
        <Divider />
        <List>
          <Typography>Options</Typography>
          {menuItems.map(item => {
            return (
              <ListItem button key={item.name}>
                {item.icon}
                <ListItemText primary={item.name} />
              </ListItem>
            )
          })}
        </List>
      </div>
    </Drawer>
  )
}

export default DrawerMenu

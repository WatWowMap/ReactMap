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
    { name: 'Gyms', icon: <ArrowForwardIos /> },
    { name: 'Raids', icon: <ArrowForwardIos /> },
    { name: 'Pokestops', icon: <ArrowForwardIos /> },
    { name: 'Quests', icon: <ArrowForwardIos /> },
    { name: 'Invasions', icon: <ArrowForwardIos /> },
    { name: 'Spawnpoints', icon: <ArrowForwardIos /> },
    { name: 'Pokemon', icon: <ArrowForwardIos /> },
    { name: 'Ingress Portals', icon: <ArrowForwardIos /> },
    { name: 'Scan-Cells', icon: <ArrowForwardIos /> },
    { name: 'S2-Cells', icon: <ArrowForwardIos /> },
    { name: 'Weather', icon: <ArrowForwardIos /> },
    { name: 'ScanAreas', icon: <ArrowForwardIos /> },
    { name: 'Devices', icon: <ArrowForwardIos /> }
  ]

  const menuItems = [
    { name: 'Areas', icon: <ArrowForwardIos /> },
    { name: 'Stats', icon: <ArrowForwardIos /> },
    { name: 'Search', icon: <ArrowForwardIos /> },
    { name: 'Settings', icon: <ArrowForwardIos /> },
    { name: 'ClearCache', icon: <ArrowForwardIos /> },
    { name: 'Discord', icon: <ArrowForwardIos /> },
    { name: 'Logout', icon: <ArrowForwardIos /> }
  ]

  const list = (anchor) => (
    <div
      className={clsx(classes.list)}
      role="presentation"
      onKeyDown={toggleDrawer(anchor, false)}
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
                selected={selected[item.name]}
                onChange={() => {
                  setSelected({ ...selected, [item.name]: !selected[item.name] });
                }}
              >
                {selected[item.name] ? <Check style={{ fontSize: 15, color: 'green' }} /> : <Clear style={{ fontSize: 15, color: 'red' }} />}

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
  )

  return (
    <div>
      {['left'].map((anchor) => (
        <React.Fragment key={anchor}>
          <Button onClick={toggleDrawer(anchor, true)}>{anchor}</Button>
          <Drawer anchor={anchor} open={drawer[anchor]} onClose={toggleDrawer(anchor, false)}>
            {list(anchor)}
          </Drawer>
        </React.Fragment>
      ))}
    </div>
  )
}

export default DrawerMenu

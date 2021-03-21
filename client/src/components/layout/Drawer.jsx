import React from 'react'
import clsx from 'clsx'
import { makeStyles } from '@material-ui/core/styles'
import { Drawer, Button, List, ListItem, ListItemText, Typography, Accordion, AccordionSummary, AccordionDetails } from '@material-ui/core'
import { Check, Clear, ArrowForwardIos, ExpandMore } from '@material-ui/icons'
import { ToggleButton } from '@material-ui/lab'
import theme from './theme.js'

const useStyles = makeStyles((theme) => ({
  list: {
    width: 'auto',
    zIndex: 9998,
    color: '#FFFFFF',
    backgroundColor: 'rgb(51,51,51)'
  },
  drawer: {
    background: 'rgb(51,51,51)'
  },
  heading: {
    fontSize: theme.typography.pxToRem(15),
    flexBasis: '33.33%',
    flexShrink: 0,
  }
}))

const DrawerMenu = ({ drawer, toggleDrawer, globalFilters, setGlobalFilters, toggleDialog }) => {
  const classes = useStyles(theme)
  const [expanded, setExpanded] = React.useState(false);

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  const filterItems = [
    { name: 'Gyms', icon: <ArrowForwardIos />, meta: 'gyms' },
    { name: 'Raids', icon: <ArrowForwardIos />, meta: 'raids' },
    { name: 'Pokestops', icon: <ArrowForwardIos />, meta: 'pokestops' },
    { name: 'Quests', icon: <ArrowForwardIos />, meta: 'quests' },
    { name: 'Invasions', icon: <ArrowForwardIos />, meta: 'invasions' },
    { name: 'Spawnpoints', icon: <ArrowForwardIos />, meta: 'spawnpoints' },
    { name: 'Pokemon', icon: <ArrowForwardIos />, meta: 'pokemon' },
    { name: 'Ingress Portals', icon: <ArrowForwardIos />, meta: 'portals' },
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
    <Drawer anchor={'left'} open={drawer} onClose={toggleDrawer(false)} classes={{ paper: classes.drawer }}>
      <div
        className={clsx(classes.list)}
        role="presentation"
        onKeyDown={toggleDrawer(false)}
      >
        <Accordion expanded={expanded === 'panel1'} onChange={handleChange('panel1')} className={clsx(classes.list)}>
          <AccordionSummary
            expandIcon={<ExpandMore />}
          >
            <Typography className={classes.heading}>Filters</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              {filterItems.map(item => {
                return (
                  <ListItem button key={item.name}>
                    {item.icon}&nbsp;
                    <ListItemText primary={item.name} onClick={toggleDialog(true, item.meta)} />&nbsp;&nbsp;&nbsp;
                    <ToggleButton
                      value="x"
                      selected={globalFilters[item.meta].enabled}
                      onChange={() => {
                        setGlobalFilters({ ...globalFilters, [item.meta]: { ...globalFilters[item.meta], enabled: !globalFilters[item.meta].enabled } })
                      }}
                    >
                      {globalFilters[item.meta].enabled ? <Check style={{ fontSize: 10, color: 'green' }} /> : <Clear style={{ fontSize: 10, color: 'red' }} />}
                    </ToggleButton>
                  </ListItem>
                )
              })}
            </List>
          </AccordionDetails>
        </Accordion>
        <Accordion expanded={expanded === 'panel2'} onChange={handleChange('panel2')} className={clsx(classes.list)}>
          <AccordionSummary
            expandIcon={<ExpandMore />}
            aria-controls="panel2bh-content"
            id="panel2bh-header"
          >
            <Typography className={classes.heading}>Options</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              {menuItems.map(item => {
                return (
                  <ListItem button key={item.name}>
                    {item.icon}
                    <ListItemText primary={item.name} onClick={toggleDialog(true, item.meta)} />
                  </ListItem>
                )
              })}
            </List>
          </AccordionDetails>
        </Accordion>
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
      </div>
    </Drawer >
  )
}

export default DrawerMenu

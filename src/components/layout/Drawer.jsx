import React from 'react'
import clsx from 'clsx'
import {
  Drawer, Button, List, ListItem, ListItemText, Typography, Accordion, AccordionSummary, AccordionDetails, IconButton,
} from '@material-ui/core'
import {
  Check, Clear, ArrowForwardIos, ExpandMore,
} from '@material-ui/icons'

import useStyles from '../../assets/mui/styling'

export default function DrawerMenu({
  drawer, toggleDrawer, globalFilters, setGlobalFilters, toggleDialog,
}) {
  const classes = useStyles()
  const [expanded, setExpanded] = React.useState('filters')

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false)
  }

  const filterItems = [
    { name: 'Gyms', icon: <ArrowForwardIos />, meta: 'gyms' },
    { name: 'Raids', icon: <ArrowForwardIos />, meta: 'raids' },
    { name: 'Pokestops', icon: <ArrowForwardIos />, meta: 'pokestops' },
    // { name: 'Quests', icon: <ArrowForwardIos />, meta: 'quests' },
    // { name: 'Invasions', icon: <ArrowForwardIos />, meta: 'invasions' },
    { name: 'Spawnpoints', icon: <ArrowForwardIos />, meta: 'spawnpoints' },
    { name: 'Pokemon', icon: <ArrowForwardIos />, meta: 'pokemon' },
    { name: 'Ingress Portals', icon: <ArrowForwardIos />, meta: 'portals' },
    { name: 'Scan-Cells', icon: <ArrowForwardIos />, meta: 'scanCells' },
    { name: 'Wayfarer', icon: <ArrowForwardIos />, meta: 'submissionCells' },
    { name: 'Weather', icon: <ArrowForwardIos />, meta: 'weather' },
    { name: 'ScanAreas', icon: <ArrowForwardIos />, meta: 'scanAreas' },
    { name: 'Devices', icon: <ArrowForwardIos />, meta: 'devices' },
  ]

  const menuItems = [
    { name: 'Areas', icon: <ArrowForwardIos />, meta: 'areas' },
    { name: 'Stats', icon: <ArrowForwardIos />, meta: 'stats' },
    { name: 'Search', icon: <ArrowForwardIos />, meta: 'search' },
    { name: 'Settings', icon: <ArrowForwardIos />, meta: 'settings' },
    { name: 'ClearCache', icon: <ArrowForwardIos />, meta: 'clearCache' },
    { name: 'Discord', icon: <ArrowForwardIos />, meta: 'discord' },
    { name: 'Logout', icon: <ArrowForwardIos />, meta: 'logout' },
  ]

  return (
    <Drawer anchor="left" open={drawer} onClose={toggleDrawer(false)} classes={{ paper: classes.drawer }}>
      <div
        className={clsx(classes.list)}
        role="presentation"
        onKeyDown={toggleDrawer(false)}
      >
        <Accordion expanded={expanded === 'filters'} onChange={handleChange('filters')} className={clsx(classes.list)}>
          <AccordionSummary
            expandIcon={<ExpandMore />}
          >
            <Typography className={classes.heading}>Filters</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              {filterItems.map(item => (
                <ListItem button key={item.name}>
                  {item.icon}&nbsp;
                  <ListItemText primary={item.name} onClick={toggleDialog(true, item.meta)} />&nbsp;&nbsp;&nbsp;
                  <IconButton onClick={() => {
                    setGlobalFilters({
                      ...globalFilters,
                      [item.meta]: {
                        ...globalFilters[item.meta],
                        enabled: !globalFilters[item.meta].enabled,
                      },
                    })
                  }}
                  >
                    {globalFilters[item.meta].enabled ? <Check style={{ fontSize: 15, color: 'green' }} />
                      : <Clear style={{ fontSize: 15, color: 'red' }} />}
                  </IconButton>
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
        <Accordion expanded={expanded === 'options'} onChange={handleChange('options')} className={clsx(classes.list)}>
          <AccordionSummary
            expandIcon={<ExpandMore />}
            aria-controls="panel2bh-content"
            id="panel2bh-header"
          >
            <Typography className={classes.heading}>Options</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              {menuItems.map(item => (
                <ListItem button key={item.name}>
                  {item.icon}
                  <ListItemText primary={item.name} onClick={toggleDialog(true, item.meta)} />
                </ListItem>
              ))}
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
    </Drawer>
  )
}

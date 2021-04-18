import React from 'react'
import clsx from 'clsx'
import {
  Drawer, Button, List, ListItem, ListItemText, Typography, Accordion, AccordionSummary, AccordionDetails, IconButton,
} from '@material-ui/core'
import {
  Check, Clear, ArrowForwardIos, ExpandMore,
} from '@material-ui/icons'

import Utility from '../../services/Utility'
import useStyles from '../../assets/mui/styling'
import { useMasterfile } from '../../hooks/useStore'

export default function DrawerMenu({
  drawer, toggleDrawer, globalFilters, setGlobalFilters, toggleDialog,
}) {
  const classes = useStyles()
  const { filterItems, menuItems } = useMasterfile(state => state.ui)

  const [expanded, setExpanded] = React.useState('filters')

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false)
  }

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
              {Object.keys(filterItems).map(item => (
                <ListItem button key={item}>
                  <ArrowForwardIos />&nbsp;
                  <ListItemText
                    primary={Utility.getProperName(item)}
                    onClick={toggleDialog(true, item)}
                  />&nbsp;&nbsp;&nbsp;
                  <IconButton onClick={() => {
                    setGlobalFilters({
                      ...globalFilters,
                      [item]: {
                        ...globalFilters[item],
                        enabled: !globalFilters[item].enabled,
                      },
                    })
                  }}
                  >
                    {globalFilters[item].enabled ? <Check style={{ fontSize: 15, color: 'green' }} />
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
                <ListItem button key={item}>
                  <ArrowForwardIos />
                  <ListItemText primary={item} onClick={toggleDialog(true, item)} />
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

import React, { useState } from 'react'
import {
  Drawer, Button, Typography, Accordion, AccordionSummary, AccordionDetails, Grid,
} from '@material-ui/core'
import { ExpandMore } from '@material-ui/icons'

import Settings from './Settings'
import WithSubItems from './WithSubItems'
import WithSliders from './WithSliders'
import SingularItem from './SingularItem'
import Utility from '../../../services/Utility'
import useStyles from '../../../hooks/useStyles'
import { useMasterfile } from '../../../hooks/useStore'

export default function DrawerMenu({
  drawer, toggleDrawer, filters, setFilters, toggleDialog,
}) {
  const classes = useStyles()
  const { menus } = useMasterfile(state => state.ui)
  const { map: { title } } = useMasterfile(state => state.config)
  const [expanded, setExpanded] = useState(false)

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false)
  }

  const drawerItems = Object.keys(menus).map(category => {
    let content
    switch (category) {
      default:
        content = (
          Object.keys(menus[category]).map(subItem => (
            <WithSubItems
              key={`${category}-${subItem}`}
              category={category}
              filters={filters}
              setFilters={setFilters}
              subItem={subItem}
            />
          ))
        ); break
      case 'pokemon':
        content = (
          <WithSliders
            category={category}
            context={menus[category]}
            specificFilter="ivOr"
            filters={filters}
            setFilters={setFilters}
            handleChange={handleChange}
            toggleDialog={toggleDialog}
          />
        ); break
      case 'weather':
        content = (
          <SingularItem
            category={category}
            filters={filters}
            setFilters={setFilters}
          />
        ); break
      case 'settings':
        content = (
          <Settings />
        )
    }
    return (
      <Accordion
        key={category}
        expanded={expanded === category}
        onChange={handleChange(category)}
      >
        <AccordionSummary
          expandIcon={<ExpandMore style={{ color: 'white' }} />}
        >
          <Typography className={classes.heading}>
            {Utility.getProperName(category)}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid
            container
            style={{ width: 300 }}
            spacing={3}
            direction="row"
            justify="center"
            alignItems="center"
          >
            {content}
            {(category === 'pokemon'
              || category === 'gyms'
              || category === 'pokestops')
              && (
                <Grid item xs={6}>
                  <Button
                    onClick={toggleDialog(true, category)}
                    variant="contained"
                  >
                    Advanced
                  </Button>
                </Grid>
              )}
          </Grid>
        </AccordionDetails>
      </Accordion>
    )
  })

  return (
    <Drawer
      anchor="left"
      open={drawer}
      onClose={toggleDrawer(false)}
      classes={{ paper: classes.drawer }}
      style={{ overflow: 'hidden' }}
    >
      <Typography variant="h3" color="secondary" style={{ fontWeight: 'bold', margin: 5 }}>{title}</Typography>
      {drawerItems}
    </Drawer>
  )
}

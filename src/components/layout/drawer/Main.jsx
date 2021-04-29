import React from 'react'
import {
  Drawer, Button, List, ListItem, ListItemText, Typography, Accordion, AccordionSummary, AccordionDetails, Grid,
} from '@material-ui/core'
import {
  ArrowForwardIos, ExpandMore,
} from '@material-ui/icons'

import Poi from './Poi'
import Pokemon from './Pokemon'
import Weather from './Weather'
import Secondary from './Secondary'
import Utility from '../../../services/Utility'
import useStyles from '../../../assets/mui/styling'
import { useMasterfile } from '../../../hooks/useStore'

export default function DrawerMenu({
  drawer, toggleDrawer, filters, setFilters, toggleDialog,
}) {
  const classes = useStyles()
  const {
    filterItems, menuItems, adminItems, wayfarerItems,
  } = useMasterfile(state => state.ui)

  const [expanded, setExpanded] = React.useState('pokemon')

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false)
  }

  const primaryContent = Object.keys(filterItems).map(category => {
    let content
    switch (category) {
      default:
        content = (
          Object.keys(filterItems[category]).map(subItem => (
            <Poi
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
          <Pokemon
            filterItems={filterItems}
            filters={filters}
            setFilters={setFilters}
            handleChange={handleChange}
            toggleDialog={toggleDialog}
          />
        ); break
      case 'weather':
        content = (
          <Weather
            filters={filters}
            setFilters={setFilters}
          />
        ); break
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
            <Grid item xs={6}>
              <Button
                onClick={toggleDialog(true, category, '', 'filters')}
                variant="contained"
              >
                Advanced
              </Button>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    )
  })

  return (
    <Drawer anchor="left" open={drawer} onClose={toggleDrawer(false)} classes={{ paper: classes.drawer }}>
      {primaryContent}

      {[wayfarerItems, adminItems].map((each, index) => {
        const title = index ? 'admin' : 'wayfarer'
        return (
          <Secondary
            key={title}
            expanded={expanded}
            title={title}
            handleChange={handleChange}
            classes={classes}
            filters={filters}
            setFilters={setFilters}
            each={each}
          />
        )
      })}
      <List>
        {menuItems.map(item => (
          <ListItem button key={item}>
            <ArrowForwardIos />
            <ListItemText
              primary={Utility.getProperName(item)}
              onClick={toggleDialog(true, item, '', 'settings')}
            />
          </ListItem>
        ))}
      </List>
    </Drawer>
  )
}

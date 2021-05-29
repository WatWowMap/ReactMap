import React, { useState } from 'react'
import {
  Drawer, Button, Typography, Accordion, AccordionSummary, AccordionDetails, Grid, IconButton,
} from '@material-ui/core'
import { ExpandMore, Clear } from '@material-ui/icons'
import { useTranslation } from 'react-i18next'

import Settings from './Settings'
import WithSubItems from './WithSubItems'
import WithSliders from './WithSliders'
import useStyles from '../../../hooks/useStyles'
import { useStore, useStatic } from '../../../hooks/useStore'
import Areas from './Areas'

export default function DrawerMenu({
  drawer, toggleDrawer, filters, setFilters, toggleDialog,
}) {
  const classes = useStyles()
  const { menus } = useStatic(state => state.ui)
  const { drawer: drawerStyle } = useStore(state => state.settings)
  const { map: { title } } = useStatic(state => state.config)
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState('')

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
          expandIcon={<ExpandMore />}
        >
          <Typography className={classes.heading}>
            {t(category)}
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
              || category === 'pokestops'
              || category === 'nests')
              && (
                <Grid item xs={6}>
                  <Button
                    onClick={toggleDialog(true, category)}
                    variant="contained"
                  >
                    {t('advanced')}
                  </Button>
                </Grid>
              )}
            {category === 'scanAreas' && <Areas />}
          </Grid>
        </AccordionDetails>
      </Accordion>
    )
  })

  return (
    <Drawer
      anchor="left"
      variant={drawerStyle}
      open={drawer}
      onClose={toggleDrawer(false)}
      classes={{ paper: classes.drawer }}
      style={{ overflow: 'hidden' }}
    >
      <Grid
        container
        alignItems="center"
        justify="center"
      >
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
            <Clear />
          </IconButton>
        </Grid>
      </Grid>
      {drawerItems}
    </Drawer>
  )
}

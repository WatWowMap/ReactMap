import React, { useState } from 'react'
import {
  Drawer, Button, Typography, Accordion, AccordionSummary, AccordionDetails, Grid, IconButton, Icon,
} from '@material-ui/core'
import { ExpandMore, Clear, Settings } from '@material-ui/icons'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import SettingsMenu from './Settings'
import WithSubItems from './WithSubItems'
import WithSliders from './WithSliders'
import useStyles from '../../../hooks/useStyles'
import { useStore, useStatic } from '../../../hooks/useStore'
import Areas from './Areas'

export default function DrawerMenu({
  drawer, toggleDrawer, filters, setFilters, toggleDialog,
}) {
  const classes = useStyles()
  const ui = useStatic(state => state.ui)
  const staticUserSettings = useStatic(state => state.userSettings)
  const { drawer: drawerStyle } = useStore(state => state.settings)
  const { map: { title, scanAreasZoom, noScanAreaOverlay }, manualAreas } = useStatic(state => state.config)
  const auth = useStatic(state => state.auth)
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState('')

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false)
  }

  const drawerItems = Object.keys(ui).map(category => {
    let content
    switch (category) {
      default:
        content = (
          Object.keys(ui[category]).map(subItem => (
            <WithSubItems
              key={`${category}-${subItem}`}
              category={category}
              filters={filters}
              setFilters={setFilters}
              subItem={subItem}
              noScanAreaOverlay={noScanAreaOverlay}
            />
          ))
        ); break
      case 'pokemon':
        content = (
          <WithSliders
            category={category}
            context={ui[category]}
            specificFilter="ivOr"
            filters={filters}
            setFilters={setFilters}
          />
        ); break
      case 'settings':
        content = (
          <SettingsMenu />
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
            {staticUserSettings[category] && (
              <Grid item xs={6}>
                <Button
                  onClick={toggleDialog(true, category, 'options')}
                  variant="contained"
                  color="secondary"
                  startIcon={<Settings style={{ color: 'white' }} />}
                >
                  {t('options')}
                </Button>
              </Grid>
            )}
            {(category === 'pokemon'
              || category === 'gyms'
              || category === 'pokestops'
              || category === 'nests')
              && (
                <Grid item xs={6}>
                  <Button
                    onClick={toggleDialog(true, category, 'filters')}
                    variant="contained"
                    color="primary"
                  >
                    {t('advanced')}
                  </Button>
                </Grid>
              )}
            {category === 'scanAreas' && (
            <Areas
              scanAreasZoom={scanAreasZoom}
              manualAreas={manualAreas}
            />
            )}
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
            <Clear style={{ color: 'white' }} />
          </IconButton>
        </Grid>
      </Grid>
      {drawerItems}
      {(auth.enabledAuthMethods.length > 0) && (
        <Grid item align="center" style={{ textAlign: 'center', margin: 40 }}>
          {auth.loggedIn ? (
            <Button
              variant="contained"
              style={{
                backgroundColor: 'rgb(114,136,218)',
                color: 'white',
              }}
              size="small"
              href="/logout"
            >
              {auth.enabledAuthMethods.length === 1
              && auth.enabledAuthMethods.includes('discord')
              && (<Icon className="fab fa-discord" style={{ fontSize: 20 }} />)}
              &nbsp;{t('logout')}&nbsp;
            </Button>
          ) : (
            <Link to="/login" style={{ textDecoration: 'none' }}>
              <Button
                variant="contained"
                style={{
                  backgroundColor: 'rgb(114,136,218)',
                  color: 'white',
                }}
                size="small"
              >
                {auth.enabledAuthMethods.length === 1
                && auth.enabledAuthMethods.includes('discord')
                && (<Icon className="fab fa-discord" style={{ fontSize: 20 }} />)}
                &nbsp;{t('login')}&nbsp;
              </Button>
            </Link>
          )}
        </Grid>
      )}
    </Drawer>
  )
}

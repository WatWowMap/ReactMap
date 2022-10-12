import React from 'react'
import {
  Drawer,
  Button,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  IconButton,
} from '@material-ui/core'
import { ExpandMore, Clear, Settings } from '@material-ui/icons'
import { useTranslation } from 'react-i18next'

import Utility from '@services/Utility'

import SettingsMenu from './Settings'
import WithSubItems from './WithSubItems'
import PokemonSection from './Pokemon'
import useStyles from '../../../hooks/useStyles'
import { useStore, useStatic } from '../../../hooks/useStore'
import Areas from './Areas'

export default function Sidebar({
  drawer,
  toggleDrawer,
  filters,
  setFilters,
  toggleDialog,
  Icons,
}) {
  const sidebar = useStore((state) => state.sidebar)
  const setSidebar = useStore((state) => state.setSidebar)
  const classes = useStyles()
  const ui = useStatic((state) => state.ui)
  const staticUserSettings = useStatic((state) => state.userSettings)
  const {
    map: {
      title,
      scanAreasZoom,
      scanAreaMenuHeight,
      noScanAreaOverlay,
      enableQuestSetSelector,
    },
  } = useStatic((state) => state.config)
  const available = useStatic((s) => s.available)
  const { t } = useTranslation()

  const handleChange = (panel) => (event, isExpanded) => {
    setSidebar(isExpanded ? panel : false)
  }

  const drawerItems = Object.keys(ui).map((category) => {
    let content
    switch (category) {
      case 'pokemon':
        content = (
          <PokemonSection
            category={category}
            context={ui[category]}
            specificFilter="ivOr"
            filters={filters}
            setFilters={setFilters}
          />
        )
        break
      case 'settings':
        content = <SettingsMenu toggleDialog={toggleDialog} Icons={Icons} />
        break
      default:
        content = Object.keys(ui[category]).map((subItem) => (
          <WithSubItems
            key={`${category}-${subItem}`}
            category={category}
            data={ui[category][subItem]}
            filters={filters}
            setFilters={setFilters}
            subItem={subItem}
            noScanAreaOverlay={noScanAreaOverlay}
            enableQuestSetSelector={enableQuestSetSelector}
            available={available}
          />
        ))
        break
    }
    return (
      <Accordion
        key={category}
        expanded={sidebar === category}
        onChange={handleChange(category)}
      >
        <AccordionSummary
          expandIcon={<ExpandMore style={{ color: 'white' }} />}
        >
          <Typography className={classes.heading}>
            {t(Utility.camelToSnake(category))}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid
            container
            style={{ width: 300 }}
            spacing={3}
            direction="row"
            justifyContent="center"
            alignItems="center"
          >
            {content}
            {staticUserSettings[category] && (
              <Grid
                item
                xs={t('drawer_grid_options_width')}
                style={{ textAlign: 'center' }}
              >
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
            {(category === 'pokemon' ||
              category === 'gyms' ||
              category === 'pokestops' ||
              category === 'nests') && (
              <Grid
                item
                xs={t('drawer_grid_advanced_width')}
                style={{ textAlign: 'center' }}
              >
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
                scanAreaMenuHeight={scanAreaMenuHeight}
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
      variant="temporary"
      open={drawer}
      onClose={toggleDrawer(false)}
      classes={{ paper: classes.drawer }}
    >
      <Grid container alignItems="center" justifyContent="center">
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
    </Drawer>
  )
}

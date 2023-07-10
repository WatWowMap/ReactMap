/* eslint-disable no-nested-ternary */
import React, { Fragment } from 'react'
import ExpandMore from '@material-ui/icons/ExpandMore'
import Settings from '@material-ui/icons/Settings'
import {
  Button,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
} from '@material-ui/core'

import { useTranslation } from 'react-i18next'

import { useStore, useStatic } from '@hooks/useStore'
import Utility from '@services/Utility'

import SettingsMenu from './Settings'
import ItemToggle from './ItemToggle'
import PokemonSection from './Pokemon'
import Areas from './Areas'
import Extras from './Extras'

export default function DrawerSection({ category, value, toggleDialog }) {
  const { t } = useTranslation()

  const sidebar = useStore((s) => s.sidebar)
  const staticUserSettings = useStatic((s) => s.userSettings)
  const { config } = useStatic.getState()

  const handleChange = (panel) => (_, isExpanded) =>
    useStore.setState({ sidebar: isExpanded ? panel : false })

  return (
    <Accordion
      expanded={sidebar === category}
      onChange={handleChange(category)}
      TransitionProps={{ unmountOnExit: true }}
    >
      <AccordionSummary expandIcon={<ExpandMore style={{ color: 'white' }} />}>
        <Typography>{t(Utility.camelToSnake(category))}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Grid
          container
          spacing={3}
          direction="row"
          justifyContent="center"
          alignItems="center"
        >
          {category === 'pokemon' ? (
            <PokemonSection category={category} context={value} />
          ) : category === 'settings' ? (
            <SettingsMenu toggleDialog={toggleDialog} />
          ) : (
            Object.entries(value).map(([subItem, subValue]) =>
              category === 'scanAreas' &&
              config.map.noScanAreasOverlay ? null : (
                <Fragment key={`${category}-${subItem}`}>
                  <ItemToggle category={category} subItem={subItem} />
                  <Extras
                    category={category}
                    subItem={subItem}
                    data={subValue}
                  />
                </Fragment>
              ),
            )
          )}
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
          {category === 'scanAreas' && <Areas />}
        </Grid>
      </AccordionDetails>
    </Accordion>
  )
}

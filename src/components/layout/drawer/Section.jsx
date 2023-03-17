/* eslint-disable no-nested-ternary */
import React from 'react'
import shallow from 'zustand/shallow'
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
import WithSubItems from './WithSubItems'
import PokemonSection from './Pokemon'
import Areas from './Areas'

export default function DrawerSection({ category, value, toggleDialog }) {
  const { t } = useTranslation()
  const { setSidebar, setFilters } = useStore.getState()
  const { config } = useStatic.getState()

  const { sidebar, filters } = useStore((s) => s, shallow)

  const staticUserSettings = useStatic((s) => s.userSettings)

  const handleChange = (panel) => (_, isExpanded) =>
    setSidebar(isExpanded ? panel : false)

  return (
    <Accordion
      expanded={sidebar === category}
      onChange={handleChange(category)}
    >
      <AccordionSummary expandIcon={<ExpandMore style={{ color: 'white' }} />}>
        <Typography>{t(Utility.camelToSnake(category))}</Typography>
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
          {category === 'pokemon' ? (
            <PokemonSection
              category={category}
              context={value}
              specificFilter="ivOr"
              filters={filters}
              setFilters={setFilters}
            />
          ) : category === 'settings' ? (
            <SettingsMenu toggleDialog={toggleDialog} />
          ) : (
            Object.keys(value).map((subItem) => (
              <WithSubItems
                key={`${category}-${subItem}`}
                category={category}
                data={value[subItem]}
                filters={filters}
                setFilters={setFilters}
                subItem={subItem}
                noScanAreaOverlay={config.map.noScanAreaOverlay}
                enableQuestSetSelector={config.map.enableQuestSetSelector}
              />
            ))
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
          {category === 'scanAreas' && (
            <Areas
              scanAreasZoom={config.map.scanAreasZoom}
              scanAreaMenuHeight={config.map.scanAreaMenuHeight}
            />
          )}
        </Grid>
      </AccordionDetails>
    </Accordion>
  )
}

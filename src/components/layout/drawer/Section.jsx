// @ts-check
import * as React from 'react'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import SettingsIcon from '@mui/icons-material/Settings'
import TuneIcon from '@mui/icons-material/Tune'
import {
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ListItemButton,
  List,
  ListItemIcon,
  ListItemText,
} from '@mui/material'

import { useTranslation } from 'react-i18next'

import { useStore, useStatic, toggleDialog } from '@hooks/useStore'
import Utility from '@services/Utility'

import SettingsMenu from './Settings'
import ItemToggle from './ItemToggle'
import PokemonSection from './Pokemon'
import Areas from './Areas'
import Extras from './Extras'

export default function DrawerSection({ category, value }) {
  const { t } = useTranslation()

  const sidebar = useStore((s) => s.sidebar)
  const staticUserSettings = useStatic((s) => s.userSettings)

  const handleChange = (panel) => (_, isExpanded) =>
    useStore.setState({ sidebar: isExpanded ? panel : false })

  return (
    <Accordion
      expanded={sidebar === category}
      onChange={handleChange(category)}
      TransitionProps={{
        unmountOnExit:
          category !== 'pokemon' &&
          (sidebar === 'scanAreas' ? true : category === 'scanAreas'),
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>{t(Utility.camelToSnake(category))}</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 0 }}>
        <List>
          {category === 'pokemon' ? (
            <PokemonSection category={category} context={value} />
          ) : category === 'settings' ? (
            <SettingsMenu />
          ) : (
            Object.entries(value).map(([subItem, subValue]) => (
              <React.Fragment key={`${category}-${subItem}`}>
                <ItemToggle category={category} subItem={subItem} />
                <Extras category={category} subItem={subItem} data={subValue} />
              </React.Fragment>
            ))
          )}
          {staticUserSettings[category] && (
            <ListItemButton onClick={toggleDialog(true, category, 'options')}>
              <ListItemIcon>
                <SettingsIcon color="secondary" />
              </ListItemIcon>
              <ListItemText primary={t('options')} />
            </ListItemButton>
          )}
          {(category === 'pokemon' ||
            category === 'gyms' ||
            category === 'pokestops' ||
            category === 'nests') && (
            <ListItemButton onClick={toggleDialog(true, category, 'filters')}>
              <ListItemIcon>
                <TuneIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary={t('advanced')} />
            </ListItemButton>
          )}
          {category === 'scanAreas' && <Areas />}
        </List>
      </AccordionDetails>
    </Accordion>
  )
}

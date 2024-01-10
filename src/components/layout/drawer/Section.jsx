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

import {
  useStore,
  useStatic,
  toggleDialog,
  useLayoutStore,
} from '@hooks/useStore'
import Utility from '@services/Utility'

import SettingsMenu from './Settings'
import { PokemonDrawerMemo } from './Pokemon'
import Areas from './Areas'
import Extras from './Extras'
import { BoolToggle } from './BoolToggle'

const ADV_CATEGORIES = new Set(['pokemon', 'gyms', 'pokestops', 'nests'])

/** @param {{ category: keyof import('@rm/types').UIObject }} props */
const DrawerSection = ({ category }) => {
  const { t } = useTranslation()
  const sidebar = useStore((s) => s.sidebar === category)
  const staticUserSettings = useStatic((s) => !!s.userSettings[category])
  const drawer = useLayoutStore((s) => s.drawer)
  const value = useStatic((s) => s.ui[category])

  const [unmountOnExit, setUnmountOnExit] = React.useState(true)

  /** @type {(panel: string) => (e: unknown, isExpanded: boolean )=> void} */
  const handleChange = React.useCallback(
    (panel) => (_, isExpanded) =>
      useStore.setState({ sidebar: isExpanded ? panel : '' }),
    [],
  )

  React.useEffect(() => {
    if (drawer) {
      const timer = setTimeout(() => {
        setUnmountOnExit(false)
      }, 250)
      return () => clearTimeout(timer)
    }
    setUnmountOnExit(true)
  }, [drawer])

  return (
    <Accordion
      expanded={sidebar}
      onChange={handleChange(category)}
      TransitionProps={{ unmountOnExit }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>{t(Utility.camelToSnake(category))}</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 0 }}>
        <List>
          {category === 'pokemon' ? (
            <PokemonDrawerMemo />
          ) : category === 'scanAreas' ? (
            <Areas />
          ) : category === 'settings' ? (
            <SettingsMenu />
          ) : (
            Object.keys(value).map((subItem) => (
              <React.Fragment key={`${category}${subItem}`}>
                <BoolToggle
                  // @ts-ignore
                  field={`filters.${
                    category === 'wayfarer' || category === 'admin'
                      ? subItem
                      : category
                  }.${subItem}`}
                />
                <Extras category={category} subItem={subItem} />
              </React.Fragment>
            ))
          )}
          {staticUserSettings && (
            <ListItemButton onClick={toggleDialog(true, category, 'options')}>
              <ListItemIcon>
                <SettingsIcon color="secondary" />
              </ListItemIcon>
              <ListItemText primary={t('options')} />
            </ListItemButton>
          )}
          {ADV_CATEGORIES.has(category) && (
            <ListItemButton onClick={toggleDialog(true, category, 'filters')}>
              <ListItemIcon>
                <TuneIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary={t('advanced')} />
            </ListItemButton>
          )}
        </List>
      </AccordionDetails>
    </Accordion>
  )
}

export const DrawerSectionMemo = React.memo(
  DrawerSection,
  (prev, next) => prev.category === next.category,
)

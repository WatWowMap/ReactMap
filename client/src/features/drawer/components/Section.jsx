// @ts-check
import * as React from 'react'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import SettingsIcon from '@mui/icons-material/Settings'
import TuneIcon from '@mui/icons-material/Tune'
import Typography from '@mui/material/Typography'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import List from '@mui/material/List'
import { useTranslation } from 'react-i18next'

import { useMemory } from '@store/useMemory'
import { toggleDialog, useLayoutStore } from '@store/useLayoutStore'
import { useStorage } from '@store/useStorage'
import { BasicListButton } from '@components/inputs/BasicListButton'
import { BoolToggle } from '@components/inputs/BoolToggle'
import { camelToSnake } from '@utils/strings'

import { Settings } from '../settings'
import { PokemonDrawerMemo } from '../pokemon'
import { AreaSection } from '../areas'
import { Extras } from '../Extras'

const ADV_CATEGORIES = new Set([
  'pokemon',
  'gyms',
  'pokestops',
  'nests',
  'stations',
])

/** @param {{ category: keyof import('@rm/types').UIObject }} props */
const DrawerSection = ({ category }) => {
  const { t } = useTranslation()
  const sidebar = useStorage((s) => s.sidebar === category)
  const staticUserSettings = useMemory((s) => !!s.clientMenus[category])
  const drawer = useLayoutStore((s) => s.drawer)
  const value = useMemory((s) => s.ui[category])

  const [unmountOnExit, setUnmountOnExit] = React.useState(true)

  /** @type {(panel: string) => (e: unknown, isExpanded: boolean )=> void} */
  const handleChange = React.useCallback(
    (panel) => (_, isExpanded) =>
      useStorage.setState({ sidebar: isExpanded ? panel : '' }),
    [],
  )

  React.useEffect(() => {
    if (drawer && category !== 'scanAreas') {
      const timer = setTimeout(() => {
        setUnmountOnExit(false)
      }, 250)
      return () => clearTimeout(timer)
    }
    setUnmountOnExit(true)
  }, [drawer, category])

  return (
    <Accordion
      expanded={sidebar}
      onChange={handleChange(category)}
      TransitionProps={{ unmountOnExit }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>{t(camelToSnake(category))}</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 0 }}>
        <List>
          {category === 'pokemon' ? (
            <PokemonDrawerMemo />
          ) : category === 'settings' ? (
            <Settings />
          ) : (
            Object.keys(value).map((subItem) => {
              const hasSubSubCategories =
                category === 'wayfarer' || category === 'admin'
              return (
                <React.Fragment key={`${category}${subItem}`}>
                  {!(
                    category === 'nests' &&
                    (subItem === 'sliders' || subItem === 'active')
                  ) && (
                    <BoolToggle
                      // @ts-ignore
                      field={`filters.${
                        hasSubSubCategories ? subItem : category
                      }.${hasSubSubCategories ? 'enabled' : subItem}`}
                      label={subItem}
                    />
                  )}
                  <Extras category={category} subItem={subItem} />
                </React.Fragment>
              )
            })
          )}
          {staticUserSettings && (
            <BasicListButton
              onClick={toggleDialog(true, category, 'options')}
              label="options"
            >
              <SettingsIcon color="secondary" />
            </BasicListButton>
          )}
          {ADV_CATEGORIES.has(category) && (
            <BasicListButton
              onClick={toggleDialog(true, category, 'filters')}
              label="advanced"
            >
              <TuneIcon color="primary" />
            </BasicListButton>
          )}
          {category === 'scanAreas' && <AreaSection />}
        </List>
      </AccordionDetails>
    </Accordion>
  )
}

export const DrawerSectionMemo = React.memo(
  DrawerSection,
  (prev, next) => prev.category === next.category,
)

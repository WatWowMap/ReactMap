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

import { useMemory } from '@hooks/useMemory'
import { toggleDialog, useLayoutStore } from '@hooks/useLayoutStore'
import { useStorage } from '@hooks/useStorage'
import Utility from '@services/Utility'
import { BasicListButton } from '@components/inputs/BasicListButton'

import SettingsMenu from './Settings'
import { PokemonDrawerMemo } from './Pokemon'
import Areas from './areas'
import Extras from './Extras'
import { BoolToggle } from '../../components/inputs/BoolToggle'

const ADV_CATEGORIES = new Set(['pokemon', 'gyms', 'pokestops', 'nests'])

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
        <Typography>{t(Utility.camelToSnake(category))}</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 0 }}>
        <List>
          {category === 'pokemon' ? (
            <PokemonDrawerMemo />
          ) : category === 'settings' ? (
            <SettingsMenu />
          ) : (
            Object.keys(value).map((subItem) => {
              const hasSubSubCategories =
                category === 'wayfarer' || category === 'admin'
              return (
                <React.Fragment key={`${category}${subItem}`}>
                  {!(category === 'nests' && subItem === 'sliders') && (
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
          {category === 'scanAreas' && <Areas />}
        </List>
      </AccordionDetails>
    </Accordion>
  )
}

export const DrawerSectionMemo = React.memo(
  DrawerSection,
  (prev, next) => prev.category === next.category,
)

// @ts-check
import * as React from 'react'
import AppBar from '@mui/material/AppBar'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Collapse from '@mui/material/Collapse'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import { useTranslation } from 'react-i18next'
import Help from '@mui/icons-material/HelpOutline'

import { useMemory } from '@store/useMemory'
import { useStorage, useDeepStore } from '@store/useStorage'
import { useLayoutStore } from '@store/useLayoutStore'
import { StringFilterMemo } from '@components/filters/StringFilter'
import { TabPanel } from '@components/TabPanel'
import { BasicListButton } from '@components/inputs/BasicListButton'
import { BoolToggle } from '@components/inputs/BoolToggle'
import { MultiSelectorStore } from '@components/inputs/MultiSelector'
import { PERSONAL_SHINY_MODES } from '@assets/constants'
import { useHasShinyPlayers } from '@hooks/usePersonalShiny'

import { SelectorListMemo } from '../components/SelectorList'
import { PokemonTabPanel } from './PokemonTab'
import { PokemonModeSelector } from './ModeSelector'

function PokemonDrawer() {
  const { t } = useTranslation()
  const filterMode = useStorage((s) => s.getPokemonFilterMode())
  const [openTab, setOpenTab] = useDeepStore(`tabs.pokemon`, 0)
  const ui = useMemory((s) => s.ui.pokemon)
  const hasShinyPlayers = useHasShinyPlayers()
  // kept visible while on, so it can always be turned off again
  const shinyModeOn = useStorage(
    (s) => (s.filters?.pokemon?.personalShinyMode || 'off') !== 'off',
  )

  /** @type {import('@mui/material').TabsProps['onChange']} */
  const handleTabChange = React.useCallback(
    (_e, newValue) => setOpenTab(newValue),
    [],
  )

  return (
    <>
      <BoolToggle field="filters.pokemon.enabled" label="enabled" />
      {ui.personalShiny && (hasShinyPlayers || shinyModeOn) && (
        <ListItem>
          <ListItemText primary={t('personal_shiny_mode')} />
          <MultiSelectorStore
            field="filters.pokemon.personalShinyMode"
            items={PERSONAL_SHINY_MODES}
            tKey="personal_shiny_mode_"
            defaultValue="off"
          />
        </ListItem>
      )}
      <PokemonModeSelector />
      <Collapse in={filterMode === 'intermediate'}>
        <BoolToggle
          field="userSettings.pokemon.linkGlobalAndAdvanced"
          label="link_global_and_advanced"
        />
      </Collapse>
      <Collapse in={filterMode === 'expert' && ui.legacy}>
        <StringFilterMemo field="filters.pokemon.ivOr" />
      </Collapse>
      <Collapse in={filterMode !== 'expert'}>
        <AppBar position="static">
          <Tabs value={openTab} onChange={handleTabChange}>
            <Tab label={t('main')} />
            <Tab label={t('extra')} />
            <Tab label={t('select')} />
          </Tabs>
        </AppBar>
        {Object.entries(ui.sliders).map(([sType, sliders], index) => (
          <PokemonTabPanel
            key={sType}
            openTab={openTab}
            index={index}
            sliders={sliders}
          />
        ))}
        <TabPanel value={openTab} index={2} disablePadding>
          <SelectorListMemo category="pokemon" />
        </TabPanel>
      </Collapse>
      <BasicListButton
        label="filter_help"
        onClick={() => useLayoutStore.setState({ pkmnFilterHelp: true })}
      >
        <Help />
      </BasicListButton>
    </>
  )
}

export const PokemonDrawerMemo = React.memo(PokemonDrawer)

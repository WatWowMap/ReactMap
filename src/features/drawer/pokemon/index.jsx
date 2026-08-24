// @ts-check

import { StringFilterMemo } from '@components/filters/StringFilter'
import { BasicListButton } from '@components/inputs/BasicListButton'
import { BoolToggle } from '@components/inputs/BoolToggle'
import { TabPanel } from '@components/TabPanel'
import Help from '@mui/icons-material/HelpOutline'
import AppBar from '@mui/material/AppBar'
import Collapse from '@mui/material/Collapse'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import { useLayoutStore } from '@store/useLayoutStore'
import { useMemory } from '@store/useMemory'
import { useDeepStore, useStorage } from '@store/useStorage'
import * as React from 'react'
import { useTranslation } from 'react-i18next'

import { SelectorListMemo } from '../components/SelectorList'
import { PokemonModeSelector } from './ModeSelector'
import { PokemonTabPanel } from './PokemonTab'

function PokemonDrawer() {
  const { t } = useTranslation()
  const filterMode = useStorage((s) => s.getPokemonFilterMode())
  const [openTab, setOpenTab] = useDeepStore(`tabs.pokemon`, 0)
  const ui = useMemory((s) => s.ui.pokemon)

  /** @type {import('@mui/material').TabsProps['onChange']} */
  const handleTabChange = React.useCallback(
    (_e, newValue) => setOpenTab(newValue),
    [],
  )

  return (
    <>
      <BoolToggle field="filters.pokemon.enabled" label="enabled" />
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

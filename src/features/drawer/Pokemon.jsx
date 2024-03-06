// @ts-check
/* eslint-disable react/no-unstable-nested-components */
import * as React from 'react'
import AppBar from '@mui/material/AppBar'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListSubheader from '@mui/material/ListSubheader'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import Collapse from '@mui/material/Collapse'
import { useTranslation } from 'react-i18next'
import Help from '@mui/icons-material/HelpOutline'

import { useMemory } from '@store/useMemory'
import { useStorage, useDeepStore } from '@store/useStorage'
import { Utility } from '@services/Utility'
import { XXS_XXL, NUNDO_HUNDO } from '@assets/constants'
import { useLayoutStore } from '@store/useLayoutStore'
import { StringFilterMemo } from '@components/filters/StringFilter'
import { SliderTile } from '@components/inputs/SliderTile'
import { TabPanel } from '@components/TabPanel'
import { GenderListItem } from '@components/filters/Gender'
import { BasicListButton } from '@components/inputs/BasicListButton'
import { BoolToggle, DualBoolToggle } from '@components/inputs/BoolToggle'

import { SelectorListMemo } from './SelectorList'

function PokemonDrawer() {
  const filterMode = useStorage((s) => s.getPokemonFilterMode())
  const [ivOr, setIvOr] = useDeepStore('filters.pokemon.ivOr')
  const { t } = useTranslation()
  const [openTab, setOpenTab] = useDeepStore(`tabs.pokemon`, 0)
  const ui = useMemory((s) => s.ui.pokemon)
  const selectRef = React.useRef(/** @type {HTMLDivElement | null} */ (null))

  /** @type {import('@rm/types').RMSliderHandleChange<keyof import('@rm/types').PokemonFilter>} */
  const handleChange = React.useCallback((name, values) => {
    if (name in ivOr) {
      setIvOr(name, values)
    }
    Utility.analytics('Global Pokemon', `${name}: ${values}`, `Pokemon Text`)
  }, [])

  /** @type {import('@mui/material').TabsProps['onChange']} */
  const handleTabChange = React.useCallback(
    (_e, newValue) => setOpenTab(newValue),
    [],
  )

  return (
    <>
      <BoolToggle field="filters.pokemon.enabled" label="enabled" />
      <ListItem>
        <FormControl fullWidth>
          <InputLabel id="pokemon-filter-mode">
            {t('pokemon_filter_mode')}
          </InputLabel>
          <Select
            ref={selectRef}
            labelId="pokemon-filter-mode"
            id="demo-simple-select"
            value={filterMode}
            fullWidth
            size="small"
            label={t('pokemon_filter_mode')}
            renderValue={(selected) => t(selected)}
            onChange={(e) => {
              const { setPokemonFilterMode } = useStorage.getState()
              switch (e.target.value) {
                case 'basic':
                  return setPokemonFilterMode(false, true)
                case 'intermediate':
                  return setPokemonFilterMode(false, false)
                case 'expert':
                  return setPokemonFilterMode(true, false)
                default:
              }
            }}
          >
            {['basic', 'intermediate', ...(ui.legacy ? ['expert'] : [])].map(
              (tier) => (
                <MenuItem
                  key={tier}
                  dense
                  value={tier}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    whiteSpace: 'normal',
                    width: selectRef.current?.clientWidth || 'auto',
                  }}
                >
                  <Typography variant="subtitle2">{t(tier)}</Typography>
                  <Typography variant="caption" flexWrap="wrap">
                    {t(`${tier}_description`)}
                  </Typography>
                </MenuItem>
              ),
            )}
          </Select>
        </FormControl>
      </ListItem>
      <Collapse in={filterMode === 'intermediate'}>
        <BoolToggle
          field="userSettings.pokemon.linkGlobalAndAdvanced"
          label="link_global_and_advanced"
        />
      </Collapse>
      {filterMode === 'expert' && ui.legacy ? (
        <StringFilterMemo field="filters.pokemon.ivOr" />
      ) : (
        <>
          <AppBar position="static">
            <Tabs value={openTab} onChange={handleTabChange}>
              <Tab label={t('main')} />
              <Tab label={t('extra')} />
              <Tab label={t('select')} />
            </Tabs>
          </AppBar>
          {Object.entries(ui.sliders).map(([sType, sliders], index) => (
            <TabPanel value={openTab} index={index} key={sType}>
              <List>
                {sliders.map((slider) => (
                  <ListItem key={slider.name} disablePadding>
                    <SliderTile
                      slide={slider}
                      handleChange={handleChange}
                      values={ivOr[slider.name]}
                    />
                  </ListItem>
                ))}
                {index ? (
                  <DualBoolToggle
                    items={XXS_XXL}
                    field="filters.pokemon.ivOr"
                    label="size_1-size_5"
                  />
                ) : (
                  <>
                    <GenderListItem
                      disablePadding
                      field="filters.pokemon.ivOr"
                      sx={{ pt: 1 }}
                    />
                    <Divider sx={{ mt: 2, mb: 1 }} />
                    <ListSubheader disableGutters>
                      {t('quick_select')}
                    </ListSubheader>
                    <DualBoolToggle
                      field="filters.pokemon"
                      items={NUNDO_HUNDO}
                    />
                  </>
                )}
              </List>
            </TabPanel>
          ))}
          <TabPanel value={openTab} index={2} disablePadding>
            <SelectorListMemo category="pokemon" />
          </TabPanel>
        </>
      )}
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

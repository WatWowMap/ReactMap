// @ts-check
/* eslint-disable react/no-unstable-nested-components */
import * as React from 'react'
import {
  Typography,
  AppBar,
  Tab,
  Tabs,
  List,
  ListItem,
  Collapse,
  Divider,
  ListSubheader,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

import { useDeepStore, useStore } from '@hooks/useStore'
import Utility from '@services/Utility'
import { FILTER_SIZES, IV_OVERRIDES } from '@assets/constants'

import { StringFilterMemo } from '../dialogs/filters/StringFilter'
import SliderTile from '../dialogs/filters/SliderTile'
import TabPanel from '../general/TabPanel'
import { BoolToggle, DualBoolToggle } from './BoolToggle'
import { GenderListItem } from '../dialogs/filters/Gender'
import { MemoSelectorList } from './SelectorList'

export default function WithSliders({ category, context }) {
  const userSettings = useStore((s) => s.userSettings[category])
  const filterMode = useStore((s) => s.getPokemonFilterMode())
  const [ivOr, setIvOr] = useDeepStore('filters.pokemon.ivOr')
  const { t } = useTranslation()
  const [openTab, setOpenTab] = React.useState(0)

  const selectRef = React.useRef(/** @type {HTMLDivElement | null} */ (null))

  /** @type {import('@rm/types').RMSliderHandleChange<keyof import('@rm/types').PokemonFilter>} */
  const handleChange = React.useCallback((name, values) => {
    if (name in ivOr) {
      setIvOr(name, values)
    }
    Utility.analytics(
      'Global Pokemon',
      `${name}: ${values}`,
      `${category} Text`,
    )
  }, [])

  const handleTabChange = (_e, newValue) => setOpenTab(newValue)

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
              const { setPokemonFilterMode } = useStore.getState()
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
            {[
              'basic',
              'intermediate',
              ...(context.legacy ? ['expert'] : []),
            ].map((tier) => (
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
            ))}
          </Select>
        </FormControl>
      </ListItem>

      <Collapse in={filterMode === 'intermediate'}>
        <BoolToggle
          field="userSettings.pokemon.linkGlobalAndAdvanced"
          label="link_global_and_advanced"
        />
      </Collapse>
      {userSettings.legacyFilter && context.legacy ? (
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
          {Object.keys(context.sliders).map((slider, index) => (
            <TabPanel value={openTab} index={index} key={slider}>
              <List>
                {Object.values(context.sliders[slider]).map((subItem) => (
                  <ListItem key={subItem.name} disablePadding>
                    <SliderTile
                      filterSlide={subItem}
                      handleChange={handleChange}
                      filterValues={ivOr[subItem.name]}
                    />
                  </ListItem>
                ))}
                {index ? (
                  <DualBoolToggle
                    items={FILTER_SIZES}
                    field="filters.pokemon.ivOr"
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
                      items={IV_OVERRIDES}
                    />
                  </>
                )}
              </List>
            </TabPanel>
          ))}
          <TabPanel value={openTab} index={2} disablePadding>
            <MemoSelectorList category="pokemon" />
          </TabPanel>
        </>
      )}
    </>
  )
}

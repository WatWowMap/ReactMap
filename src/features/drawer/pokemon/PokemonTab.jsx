// @ts-check
import * as React from 'react'
import Divider from '@mui/material/Divider'
import List from '@mui/material/List'
import ListSubheader from '@mui/material/ListSubheader'
import { useTranslation } from 'react-i18next'

import { XXS_XXL, NUNDO_HUNDO, PERSONAL_BACKGROUND } from '@assets/constants'
import { TabPanel } from '@components/TabPanel'
import { GenderListItem } from '@components/filters/Gender'
import { DualBoolToggle } from '@components/inputs/BoolToggle'
import { useMemory } from '@store/useMemory'
import { useHasShinyPlayers } from '@hooks/usePersonalShiny'
import { PersonalShinyFilter } from '@components/filters/PersonalShiny'
import { PokemonSlider } from './PokemonSlider'

/**
 *
 * @param {{
 *  openTab: number,
 *  index: number,
 *  sliders: import('@rm/types').RMSlider[],
 * }} param0
 * @returns
 */
export function PokemonTabPanel({ openTab, index, sliders }) {
  const { t } = useTranslation()
  const hasShinyPlayers = useHasShinyPlayers()
  const personalBackgrounds = useMemory((s) => !!s.auth.personalBackgrounds)
  const personalShiny =
    useMemory((s) => !!s.ui.pokemon?.personalShiny) && hasShinyPlayers
  return (
    <TabPanel value={openTab} index={index}>
      <List>
        {sliders.map((slider) => (
          <PokemonSlider key={slider.name} slider={slider} />
        ))}
        {!index && personalShiny && (
          <PersonalShinyFilter field="filters.pokemon.ivOr" />
        )}
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
            <ListSubheader disableGutters>{t('quick_select')}</ListSubheader>
            <DualBoolToggle field="filters.pokemon" items={NUNDO_HUNDO} />
            {personalShiny && personalBackgrounds && (
              // only while there are backgrounds to predict (events); half a
              // row, so it lines up with the quick selects above
              <DualBoolToggle
                field="filters.pokemon"
                items={PERSONAL_BACKGROUND}
                label="personal_background-"
              />
            )}
          </>
        )}
      </List>
    </TabPanel>
  )
}

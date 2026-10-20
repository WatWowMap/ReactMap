// @ts-check
import * as React from 'react'
import { useQuery } from '@apollo/client'
import Divider from '@mui/material/Divider'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ListSubheader from '@mui/material/ListSubheader'
import { useTranslation } from 'react-i18next'

import { XXS_XXL, NUNDO_HUNDO } from '@assets/constants'
import { TabPanel } from '@components/TabPanel'
import { GenderListItem } from '@components/filters/Gender'
import { DualBoolToggle } from '@components/inputs/BoolToggle'
import { MultiSelectorStore } from '@components/inputs/MultiSelector'
import { Query } from '@services/queries'
import { useMemory } from '@store/useMemory'
import { PokemonSlider } from './PokemonSlider'

const PERSONAL_SHINY_MODES = /** @type {const} */ (['off', 'include', 'only'])

/** Shows the user's shinies too, or only them, once a player is active */
function PersonalShinyMode() {
  const { t } = useTranslation()
  const max = useMemory((s) => s.auth.personalShinyMax)
  /** @type {import('@apollo/client').QueryResult<{ playerAccounts: { active: boolean }[] }>} */
  const { data } = useQuery(Query.user('GET_PLAYER_ACCOUNTS'))
  // like the server: the first players the user may have, unless paused
  const ready = !!data?.playerAccounts
    ?.slice(0, max)
    .some((account) => account.active)
  return (
    <ListItem>
      <ListItemText
        primary={t('personal_shinies')}
        secondary={ready ? undefined : t('personal_shiny_add_player')}
      />
      <MultiSelectorStore
        field="filters.pokemon.personalShiny"
        items={PERSONAL_SHINY_MODES}
        tKey="personal_shiny_"
        disabled={!ready}
      />
    </ListItem>
  )
}

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
  const personalShiny = useMemory((s) => !!s.ui.pokemon?.personalShiny)
  return (
    <TabPanel value={openTab} index={index}>
      <List>
        {sliders.map((slider) => (
          <PokemonSlider key={slider.name} slider={slider} />
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
            <ListSubheader disableGutters>{t('quick_select')}</ListSubheader>
            <DualBoolToggle field="filters.pokemon" items={NUNDO_HUNDO} />
            {personalShiny && <PersonalShinyMode />}
          </>
        )}
      </List>
    </TabPanel>
  )
}

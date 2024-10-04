import Divider from '@mui/material/Divider'
import List from '@mui/material/List'
import ListSubheader from '@mui/material/ListSubheader'
import { useTranslation } from 'react-i18next'
import { XXS_XXL, NUNDO_HUNDO } from '@assets/constants'
import { TabPanel } from '@components/TabPanel'
import { GenderListItem } from '@components/filters/Gender'
import { DualBoolToggle } from '@components/inputs/BoolToggle'

import { PokemonSlider } from './PokemonSlider'

export function PokemonTabPanel({
  openTab,
  index,
  sliders,
}: {
  openTab: number
  index: number
  sliders: import('@rm/types').RMSlider[]
}) {
  const { t } = useTranslation()

  return (
    <TabPanel index={index} value={openTab}>
      <List>
        {sliders.map((slider) => (
          <PokemonSlider key={slider.name} slider={slider} />
        ))}
        {index ? (
          <DualBoolToggle
            field="filters.pokemon.ivOr"
            items={XXS_XXL}
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
          </>
        )}
      </List>
    </TabPanel>
  )
}

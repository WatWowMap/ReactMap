import * as React from 'react'
import ExpandMore from '@mui/icons-material/ExpandMore'
import Typography from '@mui/material/Typography'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import ListItem from '@mui/material/ListItem'
import List from '@mui/material/List'
import { useTranslation } from 'react-i18next'

import { useMemory } from '@store/useMemory'
import { setDeepStore, useStorage } from '@store/useStorage'
import { analytics } from '@utils/analytics'
import { camelToSnake } from '@utils/strings'

export type MenuCategories =
  keyof import('@store/useStorage').UseStorage['menus']

export type MenuSubcategories =
  | 'others'
  | 'categories'
  | 'generations'
  | 'types'
  | 'rarity'
  | 'historicRarity'
  | 'forms'

const handleChange =
  (
    category: MenuCategories,
    subCategory: MenuSubcategories,
  ): import('@mui/material').CheckboxProps['onChange'] =>
  (event) => {
    analytics(
      'Filtering Options',
      `New Value: ${event.target.checked}`,
      `Category: ${category} Name: ${subCategory}.${event.target.name}`,
    )
    setDeepStore(
      // @ts-ignore
      `menus.${category}.filters.${subCategory}.${event.target.name}`,
      event.target.checked,
    )
  }

const handleAccordion =
  (
    category: MenuCategories,
    subCategory: MenuSubcategories,
  ): import('@mui/material').AccordionProps['onChange'] =>
  (_, isExpanded) => {
    useStorage.setState((prev) => ({
      advMenu: {
        ...prev.advMenu,
        [category]: isExpanded ? subCategory : false,
      },
    }))
  }

export function OptionCheckbox({
  category,
  subCategory,
  option,
}: {
  category: MenuCategories
  subCategory: MenuSubcategories
  option: string
}) {
  const { t } = useTranslation()
  const checked = useStorage(
    (s) => s.menus[category].filters[subCategory][option] || false,
  )
  return (
    <ListItem disablePadding disableGutters>
      <FormControlLabel
        control={
          <Checkbox
            checked={checked}
            onChange={handleChange(category, subCategory)}
            name={option}
          />
        }
        value={option}
        label={t(camelToSnake(option))}
      />
    </ListItem>
  )
}

const OptionsCheckboxMemo = React.memo(OptionCheckbox, () => true)

export function OptionsGroup({
  category,
  subCategory,
}: {
  category: MenuCategories
  subCategory: MenuSubcategories
}) {
  const { t } = useTranslation()
  const options = useMemory((s) => s.menus[category].filters[subCategory])
  const expanded = useStorage((s) => s.advMenu[category] === subCategory)

  return (
    <Accordion
      expanded={expanded}
      onChange={handleAccordion(category, subCategory)}
    >
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Typography>{t(camelToSnake(subCategory))}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <List>
          {Object.keys(options || {}).map((option) => (
            <OptionsCheckboxMemo
              key={`${category}-${subCategory}-${option}`}
              category={category}
              subCategory={subCategory}
              option={option}
            />
          ))}
        </List>
      </AccordionDetails>
    </Accordion>
  )
}

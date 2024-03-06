import React from 'react'
import ExpandMore from '@mui/icons-material/ExpandMore'
import Typography from '@mui/material/Typography'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import FormControl from '@mui/material/FormControl'
import FormGroup from '@mui/material/FormGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import { useTranslation } from 'react-i18next'

import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { analytics } from '@hooks/useAnalytics'
import { camelToSnake } from '@utils/camelToSnake'

const handleChange = (category, subCategory) => (event) => {
  analytics(
    'Filtering Options',
    `New Value: ${event.target.checked}`,
    `Category: ${category} Name: ${subCategory}.${event.target.name}`,
  )
  useStorage.setState((prev) => ({
    menus: {
      ...prev.menus,
      [category]: {
        ...prev.menus[category],
        filters: {
          ...prev.menus[category].filters,
          [subCategory]: {
            ...prev.menus[category].filters[subCategory],
            [event.target.name]: event.target.checked,
          },
        },
      },
    },
  }))
}

const handleAccordion = (category, subCategory) => (event, isExpanded) => {
  useStorage.setState((prev) => ({
    advMenu: { ...prev.advMenu, [category]: isExpanded ? subCategory : false },
  }))
}

export function OptionCheckbox({ category, subCategory, option }) {
  const { t } = useTranslation()

  const checked = useStorage(
    (state) => state.menus[category].filters[subCategory][option] || false,
  )

  return (
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
  )
}

const OptionsCheckboxMemo = React.memo(OptionCheckbox, () => true)

export function OptionsGroup({ category, subCategory }) {
  const { t } = useTranslation()
  const options = useMemory((s) =>
    Object.keys(s.menus[category].filters[subCategory] || {}),
  )
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
        <FormControl component="fieldset">
          <FormGroup>
            {options.map((option) => (
              <OptionsCheckboxMemo
                key={`${category}-${subCategory}-${option}`}
                category={category}
                subCategory={subCategory}
                option={option}
              />
            ))}
          </FormGroup>
        </FormControl>
      </AccordionDetails>
    </Accordion>
  )
}

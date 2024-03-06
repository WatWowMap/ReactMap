import * as React from 'react'
import Chip from '@mui/material/Chip'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import { useTranslation } from 'react-i18next'
import ReplayIcon from '@mui/icons-material/Replay'

import { useMemory } from '@hooks/useMemory'
import { useStorage } from '@hooks/useStorage'
import Utility from '@services/Utility'
import { BasicListButton } from '@components/inputs/BasicListButton'

import Options from './Options'

/** @type {React.CSSProperties} */
const CHIP_STYLE = { margin: 3 }

function AppliedChip({ category, subCategory, option }) {
  const { t } = useTranslation()
  const reverse = useStorage(
    (s) => !!s.menus[category]?.filters?.others?.reverse,
  )
  const valid = useStorage(
    (s) => !!s.menus[category]?.filters?.[subCategory]?.[option],
  )

  if (!valid) return null
  return (
    <Chip
      label={t(Utility.camelToSnake(option))}
      variant="outlined"
      size="small"
      color={reverse ? 'secondary' : 'primary'}
      style={CHIP_STYLE}
    />
  )
}

const AppliedChipMemo = React.memo(AppliedChip, () => true)

function Applied({ category }) {
  return Object.entries(useStorage.getState().menus[category].filters).map(
    ([subCategory, options]) =>
      Object.keys(options).map((option) => (
        <AppliedChipMemo
          key={`${subCategory}-${option}`}
          category={category}
          subCategory={subCategory}
          option={option}
        />
      )),
  )
}

const handleReset = (category) => () => {
  const { menus } = useStorage.getState()
  const resetPayload = {}
  Object.keys(menus[category].filters).forEach((cat) => {
    resetPayload[cat] = {}
    Object.keys(menus[category].filters[cat]).forEach((filter) => {
      resetPayload[cat][filter] = false
    })
  })
  useStorage.setState((prev) => ({
    menus: {
      ...prev.menus,
      [category]: { ...prev.menus[category], filters: resetPayload },
    },
  }))
}

export default function OptionsContainer({
  categories,
  category,
  countTotal,
  countShow,
}) {
  const { t } = useTranslation()
  return (
    <>
      {Object.entries(useMemory.getState().menus[category].filters).map(
        ([subCategory, options]) => {
          if (
            categories
              ? categories.length > 1 ||
                subCategory === 'others' ||
                (categories.includes('pokemon') && subCategory !== 'categories')
              : Object.keys(options).length > 1
          ) {
            return (
              <Options
                key={subCategory}
                category={category}
                subCategory={subCategory}
              />
            )
          }
          return null
        },
      )}
      <List key="resetShowing">
        <ListItem>
          <ListItemText
            primary={t('showing')}
            secondary={`${countShow}/${countTotal}`}
          />
        </ListItem>
        <ListItem className="flex-center" sx={{ flexWrap: 'wrap' }}>
          <Applied category={category} />
        </ListItem>
        <BasicListButton label="reset_filters" onClick={handleReset(category)}>
          <ReplayIcon color="error" />
        </BasicListButton>
      </List>
    </>
  )
}

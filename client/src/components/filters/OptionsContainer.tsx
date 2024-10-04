import * as React from 'react'
import Chip from '@mui/material/Chip'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import { useTranslation } from 'react-i18next'
import ReplayIcon from '@mui/icons-material/Replay'
import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { BasicListButton } from '@components/inputs/BasicListButton'
import { camelToSnake } from '@utils/strings'

import { OptionsGroup } from './Options'

const CHIP_STYLE: React.CSSProperties = { margin: 3 }

function AppliedChip({
  category,
  subCategory,
  option,
}: {
  category: import('./Options').MenuCategories
  subCategory: import('./Options').MenuSubcategories
  option: string
}) {
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
      color={reverse ? 'secondary' : 'primary'}
      label={t(camelToSnake(option))}
      size="small"
      style={CHIP_STYLE}
      variant="outlined"
    />
  )
}

const AppliedChipMemo = React.memo(AppliedChip, () => true)

function Applied({
  category,
}: {
  category: import('./Options').MenuCategories
}) {
  return Object.entries(useStorage.getState().menus[category].filters).map(
    ([subCategory, options]) =>
      Object.keys(options).map((option) => (
        <AppliedChipMemo
          key={`${subCategory}-${option}`}
          category={category}
          option={option}
          subCategory={subCategory}
        />
      )),
  )
}

const handleReset = (category: import('./Options').MenuCategories) => () => {
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

function OptContainer({
  categories,
  category,
}: {
  category: import('./Options').MenuCategories
  categories: string[]
}) {
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
              <OptionsGroup
                key={subCategory}
                category={category}
                subCategory={subCategory}
              />
            )
          }

          return null
        },
      )}
      <List>
        <CountDisplay category={category} />
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

export const OptionsContainer = React.memo(
  OptContainer,
  (prev, next) => prev.category === next.category,
)

function CountDisplay({
  category,
}: {
  category: import('./Options').MenuCategories
}) {
  const { t } = useTranslation()
  const show = useMemory((s) => s.advMenuCounts[category]?.show || 0)
  const total = useMemory((s) => s.advMenuCounts[category]?.total || 0)

  return (
    <ListItem>
      <ListItemText primary={t('showing')} secondary={`${show}/${total}`} />
    </ListItem>
  )
}

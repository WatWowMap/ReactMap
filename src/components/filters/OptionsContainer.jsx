// @ts-check
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

/** @type {React.CSSProperties} */
const CHIP_STYLE = { margin: 3 }

/**
 *
 * @param {{
 *  category: import('./Options').MenuCategories
 *  subCategory: import('./Options').MenuSubcategories
 *  option: string
 * }} props
 * @returns
 */
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
      label={t(camelToSnake(option))}
      variant="outlined"
      size="small"
      color={reverse ? 'secondary' : 'primary'}
      style={CHIP_STYLE}
    />
  )
}

const AppliedChipMemo = React.memo(AppliedChip, () => true)

/**
 *
 * @param {{ category: import('./Options').MenuCategories }} props
 * @returns
 */
function Applied({ category }) {
  return Object.entries(useStorage.getState().menus[category].filters).map(
    ([subCategory, options]) =>
      Object.keys(options).map((option) => (
        <AppliedChipMemo
          key={`${subCategory}-${option}`}
          category={category}
          // @ts-ignore
          subCategory={subCategory}
          option={option}
        />
      )),
  )
}

/**
 *
 * @param {import('./Options').MenuCategories} category
 * @returns
 */
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

/**
 * @param {{
 *  category: import('./Options').MenuCategories,
 *  categories: string[],
 * }} props
 */
function OptContainer({ categories, category }) {
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
                // @ts-ignore
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

/**
 *
 * @param {{ category: import('./Options').MenuCategories }} props
 * @returns
 */
function CountDisplay({ category }) {
  const { t } = useTranslation()
  const show = useMemory((s) => s.advMenuCounts[category]?.show || 0)
  const total = useMemory((s) => s.advMenuCounts[category]?.total || 0)
  return (
    <ListItem>
      <ListItemText primary={t('showing')} secondary={`${show}/${total}`} />
    </ListItem>
  )
}

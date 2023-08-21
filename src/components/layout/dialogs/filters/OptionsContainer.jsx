import * as React from 'react'
import Clear from '@mui/icons-material/Clear'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import { useTranslation } from 'react-i18next'

import { useStatic, useStore } from '@hooks/useStore'
import Utility from '@services/Utility'

import Options from './Options'

/** @type {React.CSSProperties} */
const CHIP_STYLE = { margin: 3 }

function AppliedChip({ category, subCategory, option }) {
  const { t } = useTranslation()
  const reverse = useStore((s) => !!s.menus[category]?.filters?.others?.reverse)
  const valid = useStore(
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
  return Object.entries(useStore.getState().menus[category].filters).map(
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
  const { menus } = useStore.getState()
  const resetPayload = {}
  Object.keys(menus[category].filters).forEach((cat) => {
    resetPayload[cat] = {}
    Object.keys(menus[category].filters[cat]).forEach((filter) => {
      resetPayload[cat][filter] = false
    })
  })
  useStore.setState((prev) => ({
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
  toggleDrawer,
}) {
  const { t } = useTranslation()
  return (
    <>
      <Grid
        container
        key="close"
        justifyContent="center"
        alignItems="center"
        display={{ xs: 'flex', sm: 'none' }}
      >
        <Grid item xs={12} textAlign="right">
          <IconButton onClick={toggleDrawer(false)} size="large">
            <Clear />
          </IconButton>
        </Grid>
      </Grid>
      {Object.entries(useStatic.getState().menus[category].filters).map(
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
      <Grid
        container
        key="resetShowing"
        justifyContent="center"
        alignItems="center"
        my={2}
      >
        <Grid item xs={5} sm={6} textAlign="center">
          <Button onClick={handleReset(category)} color="primary" size="small">
            {t('reset_filters')}
          </Button>
        </Grid>
        <Grid item xs={7} sm={6} textAlign="center">
          <Typography variant="subtitle2" align="center">
            {t('showing')}: {countShow}/{countTotal}
          </Typography>
        </Grid>
        <Grid item xs={12} className="flex-center" flexWrap="wrap">
          <Applied category={category} />
        </Grid>
      </Grid>
    </>
  )
}

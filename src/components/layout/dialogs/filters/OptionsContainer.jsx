import React from 'react'
import Clear from '@mui/icons-material/Clear'
import { Grid, Typography, Button, Chip, IconButton } from '@mui/material'

import { useTranslation } from 'react-i18next'

import useStyles from '@hooks/useStyles'
import { useStatic } from '@hooks/useStore'
import Utility from '@services/Utility'

import Options from './Options'

export default function OptionsContainer({
  advMenu,
  setAdvMenu,
  menus,
  setMenus,
  categories,
  category,
  handleReset,
  count,
  isMobile,
  toggleDrawer,
}) {
  const { t } = useTranslation()
  const classes = useStyles()
  const { [category]: staticMenus } = useStatic((state) => state.menus)

  const handleChange = (name, event) => {
    Utility.analytics(
      'Filtering Options',
      `New Value: ${event.target.checked}`,
      `Category: ${category} Name: ${name}.${event.target.name}`,
    )
    setMenus({
      ...menus,
      [category]: {
        ...menus[category],
        filters: {
          ...menus[category].filters,
          [name]: {
            ...menus[category].filters[name],
            [event.target.name]: event.target.checked,
          },
        },
      },
    })
  }

  const handleAccordion = (panel) => (event, isExpanded) => {
    setAdvMenu({
      ...advMenu,
      [category]: isExpanded ? panel : false,
    })
  }

  const applied = []
  const allFilterMenus = Object.entries(staticMenus.filters).map(
    ([cat, options]) => {
      if (
        categories
          ? categories.length > 1 ||
            cat === 'others' ||
            (categories.includes('pokemon') && cat !== 'categories')
          : Object.keys(options).length > 1
      ) {
        if (menus[category].filters[cat]) {
          Object.entries(menus[category].filters[cat]).forEach(
            ([filter, bool]) => {
              if (bool && options[filter] !== undefined) {
                applied.push(`${cat}-${filter}`)
              }
            },
          )
        }
        return (
          <Options
            key={cat}
            name={cat}
            options={options}
            userSelection={menus[category].filters[cat]}
            handleChange={handleChange}
            expanded={advMenu[category]}
            handleAccordion={handleAccordion}
          />
        )
      }
      return null
    },
  )

  allFilterMenus.push(
    <Grid
      container
      key="resetShowing"
      justifyContent="center"
      alignItems="center"
      style={{ margin: '10px 0' }}
    >
      <Grid item xs={5} sm={6} style={{ textAlign: 'center' }}>
        <Button onClick={handleReset} color="primary" size="small">
          {t('reset_filters')}
        </Button>
      </Grid>
      <Grid item xs={7} sm={6} style={{ textAlign: 'center' }}>
        <Typography variant="subtitle2" align="center">
          {t('showing')}: {count.show}/{count.total}
        </Typography>
      </Grid>
      <Grid item xs={12} className={classes.areaChips}>
        {applied.map((x) => (
          <Chip
            key={x}
            label={t(Utility.camelToSnake(x.split('-')[1]))}
            variant="outlined"
            size="small"
            color={
              menus[category].filters.others.reverse ? 'secondary' : 'primary'
            }
            style={{ margin: 3 }}
          />
        ))}
      </Grid>
    </Grid>,
  )
  if (isMobile) {
    allFilterMenus.unshift(
      <Grid container key="close" justifyContent="center" alignItems="center">
        <Grid item xs={12} style={{ textAlign: 'right' }}>
          <IconButton onClick={toggleDrawer(false)} size="large">
            <Clear style={{ color: 'white' }} />
          </IconButton>
        </Grid>
      </Grid>,
    )
  }
  return allFilterMenus
}

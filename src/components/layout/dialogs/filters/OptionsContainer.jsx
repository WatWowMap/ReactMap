import React from 'react'
import {
  Paper, InputBase, IconButton, Grid, Typography, Button, Chip,
} from '@material-ui/core'
import { HighlightOff } from '@material-ui/icons'
import { useTranslation } from 'react-i18next'

import useStyles from '@hooks/useStyles'
import { useStatic } from '@hooks/useStore'
import Utility from '@services/Utility'

import FilterOptions from './Options'

export default function MenuFilters({
  advMenu, setAdvMenu, search, setSearch, menus, setMenus,
  category, handleReset, count,
}) {
  const classes = useStyles()
  const { t } = useTranslation()
  const { [category]: staticMenus } = useStatic(state => state.menus)

  const handleChange = (name, event) => {
    Utility.analytics('Filtering Options', `New Value: ${event.target.checked}`, `Category: ${category} Name: ${name}.${event.target.name}`)
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

  const handleSearchChange = event => {
    setSearch(event.target.value.toString().toLowerCase())
  }

  const resetSearch = () => {
    setSearch('')
  }

  const handleAccordion = (panel) => (event, isExpanded) => {
    setAdvMenu({
      ...advMenu,
      [category]: isExpanded ? panel : false,
    })
  }

  const applied = []
  const allFilterMenus = Object.entries(staticMenus.filters).map(([cat, options]) => {
    if (Object.keys(options).length > 1) {
      if (menus[category].filters[cat]) {
        Object.entries(menus[category].filters[cat]).forEach(([filter, bool]) => {
          if (bool) {
            applied.push(filter)
          }
        })
      }
      return (
        <FilterOptions
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
  })

  allFilterMenus.push(
    <Paper elevation={0} variant="outlined" className={classes.search} key="search">
      <InputBase
        className={classes.input}
        placeholder={t(`search${category}`)}
        name="search"
        value={search}
        onChange={handleSearchChange}
        fullWidth
        autoComplete="off"
        variant="outlined"
      />
      <IconButton
        className={classes.iconButton}
        onClick={resetSearch}
      >
        <HighlightOff style={{ color: '#848484' }} />
      </IconButton>
    </Paper>,
    <Grid container key="resetShowing" justifyContent="center" alignItems="center" style={{ marginBottom: 10 }}>
      <Grid item xs={6} style={{ textAlign: 'center' }}>
        <Button onClick={handleReset} color="primary" size="small">
          {t('resetFilters')}
        </Button>
      </Grid>
      <Grid item xs={6} style={{ textAlign: 'center' }}>
        <Typography variant="subtitle2" align="center">
          {t('showing')}: {count.show}/{count.total}
        </Typography>
      </Grid>
      <Grid item xs={12} className={classes.areaChips}>
        {applied.map(x => (
          <Chip
            key={x}
            label={t(x)}
            variant="outlined"
            size="small"
            color={menus[category].filters.others.reverse ? 'secondary' : 'primary'}
            style={{ margin: 3 }}
          />
        ))}
      </Grid>
    </Grid>,
  )
  return allFilterMenus
}

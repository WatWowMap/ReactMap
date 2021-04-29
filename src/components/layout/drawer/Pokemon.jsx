import React from 'react'
import {
  Grid, Typography, FormControlLabel, Switch,
} from '@material-ui/core'

import Enabled from './Enabled'
import StringFilter from '../dialogs/filters/StringFilter'
import SliderTile from '../dialogs/filters/SliderTile'

export default function Pokemon({
  filterItems, filters, setFilters, handleChange,
}) {
  const handleLegacySwitch = () => {
    setFilters({
      ...filters,
      pokemon: {
        ...filters.pokemon,
        filter: {
          ...filters.pokemon.filter,
          ivOr: {
            ...filters.pokemon.filter.ivOr,
            legacy: !filters.pokemon.filter.ivOr.legacy,
          },
        },
      },
    })
  }

  return (
    <>
      <Grid item xs={6}>
        <Typography>
          Enabled
        </Typography>
      </Grid>
      <Grid item xs={6} style={{ textAlign: 'right' }}>
        <Enabled
          category="pokemon"
          filters={filters}
          setFilters={setFilters}
        />
      </Grid>
      {filters.pokemon.filter.ivOr.legacy ? (
        <>
          <Grid item xs={12}>
            <Typography>
              IV OR Filter
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <StringFilter
              filterValues={filters.pokemon.filter.ivOr}
              setFilterValues={setFilters}
            />
          </Grid>
        </>
      ) : (
        Object.values(filterItems.pokemon.sliders.primary).map(subItem => (
          <Grid item xs={12} key={subItem.shortName}>
            <SliderTile
              filterSlide={subItem}
              handleChange={handleChange}
              filterValues={filters.pokemon.filter.ivOr}
            />
          </Grid>
        ))
      )}
      <Grid item xs={6} style={{ textAlign: 'right' }}>
        <FormControlLabel
          control={(
            <Switch
              checked={filters.pokemon.filter.ivOr.legacy}
              onChange={handleLegacySwitch}
              name="adv"
              color="secondary"
            />
          )}
          label="Legacy"
        />
      </Grid>
    </>
  )
}

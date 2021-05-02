import React from 'react'
import {
  Grid, Typography, FormControlLabel, Switch,
} from '@material-ui/core'

import StringFilter from '../dialogs/filters/StringFilter'
import SliderTile from '../dialogs/filters/SliderTile'
import Utility from '../../../services/Utility'

export default function WithSliders({
  category, filters, setFilters, context, specificFilter,
}) {
  const handleLegacySwitch = () => {
    setFilters({
      ...filters,
      [category]: {
        ...filters[category],
        legacy: !filters[category].legacy,
      },
    })
  }

  const handleChange = event => {
    const { name, value } = event.target
    setFilters({
      ...filters,
      [category]: {
        ...filters[category],
        filter: {
          ...filters[category].filter,
          [specificFilter]: {
            ...filters[category].filter[specificFilter],
            [name]: value,
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
        <Switch
          checked={filters[category].enabled}
          onChange={() => {
            setFilters({
              ...filters,
              [category]: {
                ...filters[category],
                enabled: !filters[category].enabled,
              },
            })
          }}
        />
      </Grid>
      {filters[category].legacy ? (
        <>
          <Grid item xs={12}>
            <Typography>
              {Utility.getProperName(specificFilter)} Filter
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <StringFilter
              filterValues={filters[category].filter[specificFilter]}
              setFilterValues={setFilters}
            />
          </Grid>
        </>
      ) : (
        Object.values(context.sliders.primary).map(subItem => (
          <Grid item xs={12} key={subItem.shortName}>
            <SliderTile
              filterSlide={subItem}
              handleChange={handleChange}
              filterValues={filters[category].filter[specificFilter]}
            />
          </Grid>
        ))
      )}
      <Grid item xs={6} style={{ textAlign: 'right' }}>
        <FormControlLabel
          control={(
            <Switch
              checked={filters[category].legacy}
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

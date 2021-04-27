import React, { useState } from 'react'
import {
  Grid,
  Typography,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Switch,
  FormControlLabel,
} from '@material-ui/core'

import StringFilter from './StringFilter'
import { useMasterfile } from '../../../../hooks/useStore'
import SliderTile from './SliderTile'
import Size from './Size'

export default function AdvancedFilter({ toggleAdvMenu, advancedFilter, type }) {
  const isMobile = useMasterfile(state => state.breakpoint) === 'xs'
  const { filterItems } = useMasterfile(state => state.ui)

  const [filterValues, setFilterValues] = useState(advancedFilter.tempFilters)

  const handleChange = (event, values) => {
    if (typeof event === 'object') {
      const { name, value } = event.target
      setFilterValues({ ...filterValues, [name]: value })
    } else {
      setFilterValues({ ...filterValues, [event]: values })
    }
  }

  const handleLegacySwitch = () => {
    setFilterValues({ ...filterValues, legacy: !filterValues.legacy })
  }

  return (
    <>
      <DialogTitle style={{ color: 'white' }}>
        <Grid
          container
          justify="space-between"
          alignItems="center"
        >
          <Grid item xs={6}>
            Advanced
          </Grid>
          <Grid item xs={6} style={{ textAlign: 'right' }}>
            <FormControlLabel
              control={(
                <Switch
                  checked={filterValues.legacy}
                  onChange={handleLegacySwitch}
                  name="adv"
                  color="secondary"
                  disabled={filterItems[type].legacy}
                />
              )}
              label="Legacy"
            />
          </Grid>
        </Grid>
      </DialogTitle>
      <DialogContent style={{ color: 'white' }}>
        <Grid
          container
          direction="row"
          justify="center"
          alignItems="center"
        >
          {filterValues.legacy
            ? (
              <Grid item xs={12}>
                <StringFilter
                  filterValues={filterValues}
                  setFilterValues={setFilterValues}
                />
              </Grid>
            )
            : (
              <>
                <Grid
                  item
                  xs={12}
                  sm={6}
                >
                  {filterItems[type].sliders.primary.map(each => (
                    <SliderTile
                      key={each.name}
                      name={each.name}
                      shortName={each.shortName}
                      min={each.min}
                      max={each.max}
                      handleChange={handleChange}
                      filterValues={filterValues}
                      disabled={each.disabled}
                      color="secondary"
                    />
                  ))}
                </Grid>
                <Grid item xs={12} sm={6}>
                  {filterItems[type].sliders.secondary.map(each => (
                    <SliderTile
                      key={each.name}
                      name={each.name}
                      shortName={each.shortName}
                      min={each.min}
                      max={each.max}
                      handleChange={handleChange}
                      filterValues={filterValues}
                      disabled={each.disabled}
                      color="primary"
                    />
                  ))}
                </Grid>
              </>
            )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Grid
          container
          justify="center"
          alignItems="center"
        >
          {isMobile && (
            <Grid item xs={2}>
              <Typography>Size</Typography>
            </Grid>
          )}
          <Grid item xs={4} sm={8}>
            <Size
              isMobile={isMobile}
              filterValues={filterValues}
              handleChange={handleChange}
            />
          </Grid>
          <Grid item xs={3} sm={2}>
            <Button onClick={toggleAdvMenu(false)} color="primary">
              <Typography
                variant="caption"
                color="primary"
              >
                Cancel
              </Typography>
            </Button>
          </Grid>
          <Grid item xs={3} sm={2}>
            <Button onClick={toggleAdvMenu(false, advancedFilter.id, filterValues)} color="primary">
              <Typography
                variant="caption"
                style={{ color: '#00e676' }}
              >
                Save
              </Typography>
            </Button>
          </Grid>
        </Grid>
      </DialogActions>
    </>
  )
}

import React, { useState } from 'react'
import {
  Grid,
  Typography,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  ButtonGroup,
} from '@material-ui/core'

import { useMasterfile } from '../../../../hooks/useStore'
import useStyles from '../../../../assets/mui/styling'
import SliderTile from '../components/SliderTile'

export default function AdvancedFilter({ toggleAdvMenu, advancedFilter }) {
  const classes = useStyles()
  const { filterItems: { pokemon } } = useMasterfile(state => state.ui)
  const [filterValues, setFilterValues] = useState(advancedFilter.tempFilters)

  const handleChange = (event, values) => {
    if (typeof event === 'object') {
      setFilterValues({
        ...filterValues, [event.target.name]: event.target.value,
      })
    } else {
      setFilterValues({ ...filterValues, [event]: values })
    }
  }

  const handleSize = (size) => {
    setFilterValues({
      ...filterValues, size,
    })
  }

  const mainSliders = [
    {
      name: 'IV Range', shortName: 'iv', min: 0, max: 100, disabled: pokemon.iv,
    },
    {
      name: 'Great League', shortName: 'gl', min: 1, max: 100, disabled: pokemon.pvp,
    },
    {
      name: 'Ultra League', shortName: 'ul', min: 1, max: 100, disabled: pokemon.pvp,
    },
  ]

  const statSliders = [
    {
      name: 'Level', shortName: 'level', min: 1, max: 35,
    },
    {
      name: 'Attack', shortName: 'atk', min: 0, max: 15,
    },
    {
      name: 'Defense', shortName: 'def', min: 0, max: 15,
    },
    {
      name: 'Stamina', shortName: 'sta', min: 0, max: 15,
    },
  ]

  return (
    <>
      <DialogTitle style={{ color: 'white' }}>Advanced Filtering</DialogTitle>
      <DialogContent style={{ color: 'white' }}>
        <Grid
          container
          direction="row"
          justify="center"
          alignItems="center"
        >
          <Grid
            item
            xs={12}
            sm={6}
          >
            {mainSliders.map(each => (
              <SliderTile
                key={each.name}
                name={each.name}
                shortName={each.shortName}
                min={each.min}
                max={each.max}
                handleChange={handleChange}
                filterValues={filterValues}
                disabled={!each.disabled}
                color="secondary"
              />
            ))}
          </Grid>
          <Grid
            item
            xs={12}
            sm={6}
          >
            {statSliders.map(each => (
              <SliderTile
                key={each.name}
                name={each.name}
                shortName={each.shortName}
                min={each.min}
                max={each.max}
                handleChange={handleChange}
                filterValues={filterValues}
                disabled={!pokemon.stats}
                color="primary"
              />
            ))}
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Grid
          container
          direction="row"
          justify="center"
          alignItems="center"
        >
          <Grid item xs={9} sm={10}>
            <ButtonGroup>
              {['sm', 'md', 'lg', 'xl'].map(size => {
                const color = filterValues.size === size ? 'primary' : 'secondary'
                return (
                  <Button
                    key={size}
                    onClick={() => handleSize(size)}
                    color={color}
                  >
                    {size}
                  </Button>
                )
              })}
            </ButtonGroup>
          </Grid>
          <Grid item xs={3} sm={2}>
            <Button onClick={toggleAdvMenu(false, advancedFilter.id, filterValues)} color="primary">
              <Typography
                variant="caption"
                className={classes.successButton}
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

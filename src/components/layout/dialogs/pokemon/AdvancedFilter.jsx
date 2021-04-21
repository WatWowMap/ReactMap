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

import useStyles from '../../../../assets/mui/styling'
import SliderTile from '../components/SliderTile'

export default function AdvancedFilter({ toggleAdvMenu, advancedFilter }) {
  const classes = useStyles()

  const [filterValues, setFilterValues] = useState(advancedFilter.tempFilters)

  const handleChange = (event) => {
    setFilterValues({
      ...filterValues,
      [event.target.name]: event.target.value,
    })
  }

  const handleSize = (size) => {
    setFilterValues({
      ...filterValues, size,
    })
  }

  const mainSliders = [
    {
      name: 'IV Range', shortName: 'iv', min: 0, max: 100,
    },
    {
      name: 'Great League', shortName: 'gl', min: 1, max: 100,
    },
    {
      name: 'Ultra League', shortName: 'ul', min: 1, max: 100,
    },
  ].map(each => (
    <SliderTile
      key={each.name}
      name={each.name}
      shortName={each.shortName}
      min={each.min}
      max={each.max}
      handleChange={handleChange}
      filterValues={filterValues}
      color="secondary"
    />
  ))

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
  ].map(each => (
    <SliderTile
      key={each.name}
      name={each.name}
      shortName={each.shortName}
      min={each.min}
      max={each.max}
      handleChange={handleChange}
      filterValues={filterValues}
      color="primary"
    />
  ))

  const allSizeButtons = ['sm', 'md', 'lg', 'xl'].map(size => {
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
  })

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
            container
            item
            xs={12}
            sm={6}
            direction="row"
            justify="flex-start"
            alignItems="center"
          >
            {mainSliders}
          </Grid>
          <Grid
            container
            item
            xs={12}
            sm={6}
            direction="row"
            justify="flex-start"
            alignItems="center"
          >
            {statSliders}
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
              {allSizeButtons}
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

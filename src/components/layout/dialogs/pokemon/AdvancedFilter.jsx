import React, { useState } from 'react'
import {
  Grid,
  Typography,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  ButtonGroup,
  useMediaQuery,
  Select,
  MenuItem,
  TextField,
} from '@material-ui/core'
import { useTheme } from '@material-ui/core/styles'

import { useMasterfile } from '../../../../hooks/useStore'
import Utility from '../../../../services/Utility'
import useStyles from '../../../../assets/mui/styling'
import SliderTile from '../components/SliderTile'

export default function AdvancedFilter({ toggleAdvMenu, advancedFilter }) {
  const classes = useStyles()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.only('xs'))
  const { filterItems: { pokemon } } = useMasterfile(state => state.ui)

  const [filterValues, setFilterValues] = useState(advancedFilter.tempFilters)
  const [error, setError] = useState({
    status: false,
    message: 'This filter Overrides All',
  })

  const handleChange = (event, values) => {
    if (event.target.name === 'adv') {
      const result = event.target.value
      if (Utility.checkAdvFilter(result) || result === '') {
        setError({ status: false, message: 'This filter overrides all' })
        setFilterValues({ ...filterValues, adv: result })
      } else {
        setError({ status: true, message: 'Invalid IV Filter' })
      }
    }
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

  const advancedField = (
    <TextField
      error={error.status}
      style={{ width: 225 }}
      helperText={error.message}
      color="secondary"
      name="adv"
      label="Custom"
      value={filterValues.adv}
      onChange={handleChange}
      variant="outlined"
      size="small"
      disabled={!pokemon.iv || !pokemon.stats || pokemon.pvp}
      fullWidth
    />
  )

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
                disabled={!each.disabled || filterValues.adv !== ''}
                color="secondary"
              />
            ))}
            {!isMobile && advancedField}
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
                disabled={!pokemon.stats || filterValues.adv !== ''}
                color="primary"
              />
            ))}
          </Grid>
          {isMobile && (
            <Grid item xs={12}>
              {advancedField}
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Grid
          container
          direction="row"
          justify="center"
          alignItems="center"
        >
          {isMobile && (
            <Grid item xs={2}>
              <Typography>Size</Typography>
            </Grid>
          )}
          <Grid item xs={4} sm={8}>
            {isMobile ? (
              <>
                <Select
                  name="size"
                  value={filterValues.size}
                  onChange={handleChange}
                  style={{ width: 60 }}
                >
                  {['sm', 'md', 'lg', 'xl'].map(size => (
                    <MenuItem key={size} value={size}>{size}</MenuItem>
                  ))}
                </Select>
              </>
            )
              : (
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
              )}
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

import React from 'react'
import { FormControl, FormGroup, FormControlLabel, Checkbox, Grid, Accordion, AccordionSummary, AccordionDetails, Typography } from '@material-ui/core'
import useStyles from '../styling.js'
import theme from '../../theme.js'
import { ExpandMore } from '@material-ui/icons'

const FilterOptions = ({ name, options, handleChange, expanded, handleAccordion }) => {
  const classes = useStyles(theme)
  const nameCap = name.charAt(0).toUpperCase() + name.slice(1)

  return (
    <Grid item >
      <Accordion expanded={expanded === name} onChange={handleAccordion(name)}>
        <AccordionSummary
          expandIcon={<ExpandMore style={{ color: 'white' }} />}
          style={{ color: 'white' }}
        >
          <Typography className={classes.heading}>{nameCap}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <FormControl component="fieldset" className={classes.formControl}>
            <FormGroup>
              {Object.entries(options).map(option => {
                return (
                  <FormControlLabel key={option[0]}
                    control={<Checkbox checked={option[1]} onChange={(e) => handleChange(name, e)} name={option[0]} />}
                    value={option[0]}
                    label={option[0]}
                  />
                )
              })}
            </FormGroup>
          </FormControl>
        </AccordionDetails>
      </Accordion>
    </Grid>
  )
}

export default FilterOptions
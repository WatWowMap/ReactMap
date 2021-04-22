import React from 'react'
import {
  FormControl, FormGroup, FormControlLabel, Checkbox, Grid, Accordion, AccordionSummary, AccordionDetails, Typography,
} from '@material-ui/core'
import { ExpandMore } from '@material-ui/icons'

import useStyles from '../../../../assets/mui/styling'
import Utility from '../../../../services/Utility'

export default function FilterOptions({
  name, options, handleChange, expanded, handleAccordion,
}) {
  const classes = useStyles()

  return (
    <Grid item>
      <Accordion expanded={expanded === name} onChange={handleAccordion(name)}>
        <AccordionSummary
          expandIcon={<ExpandMore style={{ color: 'white' }} />}
          style={{ color: 'white' }}
        >
          <Typography className={classes.heading}>{Utility.getProperName(name)}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <FormControl component="fieldset" className={classes.formControl}>
            <FormGroup>
              {Object.entries(options).map(option => (
                <FormControlLabel
                  key={option[0]}
                  control={<Checkbox checked={option[1]} onChange={(e) => handleChange(name, e)} name={option[0]} />}
                  value={option[0]}
                  label={Utility.getProperName(option[0])}
                />
              ))}
            </FormGroup>
          </FormControl>
        </AccordionDetails>
      </Accordion>
    </Grid>
  )
}

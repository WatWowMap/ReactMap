import React from 'react'
import {
  FormControl,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
} from '@material-ui/core'
import { ExpandMore } from '@material-ui/icons'

import useStyles from '@hooks/useStyles'
import Utility from '@services/Utility'

export default function FilterOptions({
  name, options, handleChange, expanded, handleAccordion, userSelection,
}) {
  const classes = useStyles()
  return (
    <Grid item>
      <Accordion expanded={expanded === name} onChange={handleAccordion(name)}>
        <AccordionSummary
          expandIcon={<ExpandMore />}
        >
          <Typography className={classes.heading}>
            {Utility.getProperName(name)}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <FormControl component="fieldset" className={classes.formControl}>
            <FormGroup>
              {Object.keys(options).map(key => (
                <FormControlLabel
                  key={key}
                  control={
                    <Checkbox checked={userSelection[key]} onChange={(e) => handleChange(name, e)} name={key} />
                    }
                  value={key}
                  label={Utility.getProperName(key)}
                />
              ))}
            </FormGroup>
          </FormControl>
        </AccordionDetails>
      </Accordion>
    </Grid>
  )
}

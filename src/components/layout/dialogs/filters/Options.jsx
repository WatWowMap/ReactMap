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
        >
          <Typography className={classes.heading}>{Utility.getProperName(name)}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <FormControl component="fieldset" className={classes.formControl}>
            <FormGroup>
              {Object.entries(options).map(option => {
                const [key, value] = option
                return (
                  <FormControlLabel
                    key={key}
                    control={
                      <Checkbox checked={value} onChange={(e) => handleChange(name, e)} name={key} />
                    }
                    value={key}
                    label={Utility.getProperName(key)}
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

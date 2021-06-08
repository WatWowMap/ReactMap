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
import { useTranslation } from 'react-i18next'

import useStyles from '@hooks/useStyles'

export default function FilterOptions({
  name, options, handleChange, expanded, handleAccordion, userSelection,
}) {
  const { t } = useTranslation()
  const classes = useStyles()
  return (
    <Grid item>
      <Accordion expanded={expanded === name} onChange={handleAccordion(name)}>
        <AccordionSummary
          expandIcon={<ExpandMore style={{ color: 'white' }} />}
        >
          <Typography className={classes.heading}>
            {t(name)}
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
                  label={t(key)}
                />
              ))}
            </FormGroup>
          </FormControl>
        </AccordionDetails>
      </Accordion>
    </Grid>
  )
}

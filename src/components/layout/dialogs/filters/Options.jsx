import React from 'react'
import ExpandMore from '@material-ui/icons/ExpandMore'
import {
  FormControl,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
} from '@material-ui/core'

import { useTranslation } from 'react-i18next'

import Utility from '@services/Utility'
import useStyles from '@hooks/useStyles'

export default function FilterOptions({
  name,
  options,
  handleChange,
  expanded,
  handleAccordion,
  userSelection,
}) {
  const { t } = useTranslation()
  const classes = useStyles()
  return (
    <Accordion expanded={expanded === name} onChange={handleAccordion(name)}>
      <AccordionSummary expandIcon={<ExpandMore style={{ color: 'white' }} />}>
        <Typography className={classes.heading}>
          {t(Utility.camelToSnake(name))}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <FormControl component="fieldset" className={classes.formControl}>
          <FormGroup>
            {Object.keys(options).map((key) => (
              <FormControlLabel
                key={`${name}-${key}`}
                control={
                  <Checkbox
                    checked={userSelection[key]}
                    onChange={(e) => handleChange(name, e)}
                    name={key}
                  />
                }
                value={key}
                label={t(Utility.camelToSnake(key))}
              />
            ))}
          </FormGroup>
        </FormControl>
      </AccordionDetails>
    </Accordion>
  )
}

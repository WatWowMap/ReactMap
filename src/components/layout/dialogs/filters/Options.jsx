import React from 'react'
import ExpandMore from '@mui/icons-material/ExpandMore'
import {
  FormControl,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
} from '@mui/material'

import { useTranslation } from 'react-i18next'

import Utility from '@services/Utility'

export default function FilterOptions({
  name,
  options,
  handleChange,
  expanded,
  handleAccordion,
  userSelection,
}) {
  const { t } = useTranslation()
  return (
    <Accordion expanded={expanded === name} onChange={handleAccordion(name)}>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Typography>{t(Utility.camelToSnake(name))}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <FormControl component="fieldset">
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

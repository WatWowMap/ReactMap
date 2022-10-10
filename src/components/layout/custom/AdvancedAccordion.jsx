import React from 'react'
import {
  withStyles,
  Grid,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@material-ui/core'
import { ExpandMore } from '@material-ui/icons'
import { useTranslation } from 'react-i18next'

const StyledAccordion = withStyles({
  root: {
    marginTop: 5,
    border: 'none',
    boxShadow: 'none',
    borderRadius: 5,
    '&:before': {
      display: 'none',
    },
    '&$expanded': {
      marginTop: 5,
    },
  },
  rounded: {
    borderRadius: 5,
  },
  expanded: {},
})(Accordion)

const StyledAccordionSummary = withStyles({
  root: {
    backgroundColor: '#2e2e2e',
    padding: '0px 5px 0px 8px',
    minHeight: 30,
    borderRadius: 5,
    '&$expanded': {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      minHeight: 30,
    },
  },
  content: {
    margin: '8px 0px',
    '&$expanded': {
      margin: '8px 0px',
    },
  },
  expandIcon: {
    padding: 0,
    margin: 0,
  },
  expanded: {},
})(AccordionSummary)

export default function AdvancedAccordion({ block = null, children }) {
  const { t } = useTranslation()
  return (
    <StyledAccordion>
      <StyledAccordionSummary
        expandIcon={<ExpandMore style={{ color: 'white' }} />}
      >
        <Typography variant="caption">{t('advanced')}</Typography>
      </StyledAccordionSummary>
      <AccordionDetails>
        <Grid
          container
          style={{ width: 200 }}
          direction="row"
          justifyContent="center"
          alignItems="center"
        >
          {block ?? children}
        </Grid>
      </AccordionDetails>
    </StyledAccordion>
  )
}

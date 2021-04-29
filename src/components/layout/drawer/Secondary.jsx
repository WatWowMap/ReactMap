import React, { Fragment } from 'react'
import {
  Accordion, AccordionSummary, AccordionDetails, Typography, Grid, IconButton,
} from '@material-ui/core'
import { ExpandMore, Check, Clear } from '@material-ui/icons'

import Utility from '../../../services/Utility'

export default function Secondary({
  expanded, title, handleChange, classes, filters, setFilters, each,
}) {
  return (
    <Accordion
      expanded={expanded === title}
      onChange={handleChange(title)}
      key={title}
    >
      <AccordionSummary
        expandIcon={<ExpandMore style={{ color: 'white' }} />}
      >
        <Typography className={classes.heading}>
          {Utility.getProperName(title)}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Grid
          container
          style={{ width: 300 }}
          spacing={3}
          direction="row"
          justify="center"
          alignItems="center"
        >
          {Object.keys(each).map(category => (
            <Fragment key={`${title}-${category}`}>
              <Grid item xs={6}>
                <Typography>{Utility.getProperName(category)}</Typography>
              </Grid>
              <Grid item xs={6} style={{ textAlign: 'right' }}>
                <IconButton onClick={() => {
                  setFilters({
                    ...filters,
                    [category]: {
                      ...filters[category],
                      enabled: !filters[category].enabled,
                    },
                  })
                }}
                >
                  {filters[category].enabled
                    ? <Check style={{ fontSize: 15, color: '#00e676' }} />
                    : <Clear style={{ fontSize: 15, color: 'red' }} />}
                </IconButton>
              </Grid>
            </Fragment>
          ))}
        </Grid>
      </AccordionDetails>
    </Accordion>
  )
}

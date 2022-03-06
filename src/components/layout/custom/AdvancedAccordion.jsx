import React from 'react'
import {
  createTheme, ThemeProvider, Grid, Typography, Accordion, AccordionSummary, AccordionDetails,
} from '@material-ui/core'
import { ExpandMore } from '@material-ui/icons'
import { useTranslation } from 'react-i18next'
import setTheme from '@assets/mui/theme'

const accordionTheme = {
  overrides: {
    MuiAccordion: {
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
    },
    MuiAccordionSummary: {
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
    },
  },
}

export default function AdvancedAccordion({ block, theme = {} }) {
  const { t } = useTranslation()
  return (
    <ThemeProvider theme={setTheme(theme)}>
      <ThemeProvider
        theme={(theme2) => createTheme({
          ...theme2,
          ...accordionTheme,
        })}
      >
        <Accordion>
          <AccordionSummary
            expandIcon={<ExpandMore style={{ color: 'white' }} />}
          >
            <Typography variant="caption">
              {t('advanced')}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid
              container
              style={{ width: 200 }}
              direction="row"
              justifyContent="center"
              alignItems="center"
            >
              {block}
            </Grid>
          </AccordionDetails>
        </Accordion>
      </ThemeProvider>
    </ThemeProvider>
  )
}

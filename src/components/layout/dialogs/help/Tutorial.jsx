import React, { Fragment } from 'react'
import {
  DialogTitle,
  DialogActions,
  DialogContent,
  Grid,
  Typography,
  Fab,
  IconButton,
  Button,
  useMediaQuery,
  FormControlLabel,
  Checkbox,
} from '@material-ui/core'
import { Check, Person, Menu } from '@material-ui/icons'
import { useTheme } from '@material-ui/styles'
import { useTranslation } from 'react-i18next'

import useStyles from '@hooks/useStyles'
import { useStatic, useStore } from '@hooks/useStore'

export default function Welcome({ tutorialId }) {
  const { t } = useTranslation()
  const theme = useTheme()
  const classes = useStyles()
  const isMobile = useMediaQuery(theme.breakpoints.only('xs'))
  const tutorials = useStatic(state => state.tutorials)
  const setTutorials = useStatic(state => state.setTutorials)

  const handleTutChange = event => {
    let { name } = event.target
    if (!name) name = 'close'
    console.log(name)
    setTutorials({
      ...tutorials,
      [tutorialId]: {
        ...tutorials[tutorialId],
        [name]: !tutorials[tutorialId][name],
      },
    })
  }

  console.log('hi')
  return (
    <>
      <DialogTitle className={classes.filterHeader}>
        {t(tutorialId)} {document.title}
      </DialogTitle>
      <DialogContent style={{ color: 'white' }}>
        <Grid
          container
          direction="row"
          alignItems="center"
          justify="center"
        >
          <Grid item xs={6}>
            <Typography variant="subtitle2" bottomGutter>
              Get Started:
            </Typography>
            <Fab color="primary">
              <Menu />
            </Fab>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" bottomGutter>
              View Profile:
            </Typography>
            <Fab color="primary">
              <Person />
            </Fab>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <FormControlLabel
          control={(
            <Checkbox
              checked={tutorials[tutorialId].never}
              onChange={handleTutChange}
              name="never"
              color="primary"
            />
          )}
          label={<Typography variant="caption">{t('doNotShowAgain')}</Typography>}
        />
        {isMobile ? (
          <IconButton
            onClick={handleTutChange}
          >
            <Check color="secondary" />
          </IconButton>
        ) : (
          <Button onClick={handleTutChange}>
            <Typography color="secondary" variant="caption">
              {t('close')}
            </Typography>
          </Button>
        )}
      </DialogActions>
    </>
  )
}

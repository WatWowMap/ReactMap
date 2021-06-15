import React, { Fragment } from 'react'
import {
  DialogTitle, DialogActions, DialogContent, Stepper, Step, StepLabel, Button, Typography,
} from '@material-ui/core'
import { Check, Clear } from '@material-ui/icons'
import List from '@material-ui/core/List'
import ListItem from '@material-ui/core/ListItem'
import ListItemIcon from '@material-ui/core/ListItemIcon'
import ListItemText from '@material-ui/core/ListItemText'
import ListSubheader from '@material-ui/core/ListSubheader'
import { useTranslation } from 'react-i18next'

import useStyles from '@hooks/useStyles'
import { useStore, useStatic } from '@hooks/useStore'

function getSteps() {
  return ['Profile', 'Settings']
}

function getStepContent(stepIndex) {
  switch (stepIndex) {
    case 0:
      return 'Select campaign settings...'
    case 1:
      return 'What is an ad group anyways?'
    case 2:
      return 'This is the bit I really care about!'
    default:
      return 'Unknown stepIndex'
  }
}

export default function Welcome() {
  const { t } = useTranslation()
  const classes = useStyles()
  const { perms } = useStatic(state => state.auth)
  const ui = useStatic(state => state.ui)
  const { map: { excludeList } } = useStatic(state => state.config)
  const [activeStep, setActiveStep] = React.useState(0)
  const steps = getSteps()

  console.log(perms, ui, excludeList)
  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1)
  }

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1)
  }

  const handleReset = () => {
    setActiveStep(0)
  }

  const validPerms = Object.keys(perms)

  const getSubCategories = (subCategories) => {
    const filtered = Object.keys(subCategories).filter(cat => validPerms.includes(cat) && !excludeList.includes(cat))
    return Object.keys(filtered).map(perm => (
      <ListItem key={perm} dense>
        <ListItemText primary={t(perm)} />
        <ListItemIcon>
          {perms[perm] ? <Check /> : <Clear />}
        </ListItemIcon>
      </ListItem>
    ))
  }
  return (
    <>
      <DialogTitle className={classes.filterHeader}>
        {t('welcome')} {document.title}
      </DialogTitle>
      <DialogContent style={{ color: 'white' }}>
        <Typography color="secondary">
          Permission Status:
        </Typography>
        <List dense>
          {Object.entries(ui).map(category => (
            <Fragment key={category[0]}>
              <ListSubheader>
                {category[0]}
              </ListSubheader>
              {getSubCategories(category[1])}
            </Fragment>
          ))}
          {/* {

            Object.entries(perms).map()
            if(excludeList.includes(name)) {
              return null
            }
          return (
          <ListItem key={name} dense>
            <ListItemText primary={t(name)} />
            <ListItemIcon>
              {value ? <Check /> : <Clear />}
            </ListItemIcon>
          </ListItem>
          )
          })} */}
        </List>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </DialogContent>
      <DialogActions>
        {activeStep === steps.length ? (
          <>
            <Typography>
              All steps completed
            </Typography>
            <Button onClick={handleReset}>Reset</Button>
          </>
        ) : (
          <Typography>{getStepContent(activeStep)}</Typography>
        )}
        <Button
          disabled={activeStep === 0}
          onClick={handleBack}
        >
          Back
        </Button>
        <Button variant="contained" color="secondary" onClick={handleNext}>
          {activeStep === steps.length - 1 ? 'Finish' : 'Next'}
        </Button>
      </DialogActions>
    </>
  )
}

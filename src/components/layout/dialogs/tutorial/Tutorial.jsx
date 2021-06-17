import React, { useState } from 'react'
import {
  DialogTitle,
  DialogActions,
  Button,
  MobileStepper,
  useMediaQuery,
} from '@material-ui/core'
import { KeyboardArrowLeft, KeyboardArrowRight } from '@material-ui/icons'
import { useTheme } from '@material-ui/core/styles'
import { useTranslation } from 'react-i18next'
import SwipeableViews from 'react-swipeable-views'

import useStyles from '@hooks/useStyles'
import Welcome from './Welcome'
import Advanced from './Advanced'
import Closing from './Closing'
import Sidebar from './Sidebar'
import Popups from './Popups'

const steps = ['Intro', 'Sidebar', 'Pokemon', 'Advanced', 'Popups']

export default function Tutorial({ setTutorial, setUserProfile }) {
  const theme = useTheme()
  const { t } = useTranslation()
  const classes = useStyles()
  const isMobile = useMediaQuery(theme.breakpoints.only('xs'))
  const [activeStep, setActiveStep] = useState(0)

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1)
  }

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1)
  }

  const handleTutClose = () => {
    setTutorial(false)
  }

  const handleStepChange = (step) => {
    setActiveStep(step)
  }

  return (
    <div style={{ maxWidth: 400 }}>
      <DialogTitle className={classes.filterHeader}>
        {t('tutorial')} ({t(steps[activeStep] || 'Closing')})
      </DialogTitle>
      <SwipeableViews
        axis={theme.direction === 'rtl' ? 'x-reverse' : 'x'}
        index={activeStep}
        onChangeIndex={handleStepChange}
        enableMouseEvents
        animateHeight
        containerStyle={{ minHeight: '75vh', alignItems: 'center' }}
      >
        <Welcome setUserProfile={setUserProfile} />
        <Sidebar isMobile={isMobile} />
        <Sidebar isMobile={isMobile} pokemon />
        <Advanced isMobile={isMobile} isTutorial />
        <Popups isMobile={isMobile} />
        <Closing />
      </SwipeableViews>
      <DialogActions>
        <MobileStepper
          variant="progress"
          steps={steps.length + 1}
          position="static"
          activeStep={activeStep}
          style={{ maxWidth: 400, flexGrow: 1 }}
          nextButton={(
            <Button size="small" onClick={activeStep === 5 ? handleTutClose : handleNext} name="open">
              {activeStep === 5 ? t('finish') : t('next')}
              {theme.direction === 'rtl' ? <KeyboardArrowLeft /> : <KeyboardArrowRight />}
            </Button>
          )}
          backButton={(
            <Button size="small" onClick={handleBack} disabled={activeStep === 0}>
              {theme.direction === 'rtl' ? <KeyboardArrowRight /> : <KeyboardArrowLeft />}
              {t('back')}
            </Button>
          )}
        />
      </DialogActions>
    </div>
  )
}

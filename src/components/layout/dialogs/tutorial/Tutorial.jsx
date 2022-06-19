import React, { useState } from 'react'
import {
  DialogActions,
  Button,
  MobileStepper,
  useMediaQuery,
} from '@material-ui/core'
import { KeyboardArrowLeft, KeyboardArrowRight } from '@material-ui/icons'
import { useTheme } from '@material-ui/core/styles'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@apollo/client'

import Query from '@services/Query'
import Header from '@components/layout/general/Header'
import Welcome from './Welcome'
import Advanced from './Advanced'
import Closing from './Closing'
import Sidebar from './Sidebar'
import Sliders from './Sliders'
import Popups from './Popups'

const steps = ['intro', 'sidebar', 'sliders', 'advanced', 'popups', 'closing']

export default function Tutorial({
  toggleDialog,
  setTutorial,
  setUserProfile,
}) {
  const theme = useTheme()
  const { t } = useTranslation()
  const isMobile = useMediaQuery(theme.breakpoints.only('xs'))
  const [activeStep, setActiveStep] = useState(0)
  const [setTutorialInDb] = useMutation(Query.user('setTutorial'))

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1)
  }

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1)
  }

  const handleTutClose = () => {
    setTutorial(false)
    setTutorialInDb({ variables: { tutorial: true } })
  }

  const getStepContent = (stepIndex) => {
    switch (stepIndex) {
      case 0:
        return <Welcome setUserProfile={setUserProfile} />
      case 1:
        return <Sidebar isMobile={isMobile} toggleDialog={toggleDialog} />
      case 2:
        return <Sliders isMobile={isMobile} />
      case 3:
        return <Advanced isMobile={isMobile} />
      case 4:
        return <Popups isMobile={isMobile} />
      default:
        return <Closing />
    }
  }

  return (
    <>
      <Header titles={['tutorial', steps[activeStep] || 'closing']} />
      {getStepContent(activeStep)}
      <DialogActions>
        <MobileStepper
          variant="progress"
          steps={steps.length}
          position="static"
          activeStep={activeStep}
          style={{ maxWidth: 400, flexGrow: 1 }}
          nextButton={
            <Button
              size="small"
              onClick={activeStep === 5 ? handleTutClose : handleNext}
              name="open"
            >
              {activeStep === 5 ? t('finish') : t('next')}
              {theme.direction === 'rtl' ? (
                <KeyboardArrowLeft />
              ) : (
                <KeyboardArrowRight />
              )}
            </Button>
          }
          backButton={
            <Button
              size="small"
              onClick={handleBack}
              disabled={activeStep === 0}
            >
              {theme.direction === 'rtl' ? (
                <KeyboardArrowRight />
              ) : (
                <KeyboardArrowLeft />
              )}
              {t('back')}
            </Button>
          }
        />
      </DialogActions>
    </>
  )
}

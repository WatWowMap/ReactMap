import React, { useState } from 'react'
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft'
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight'
import { Box, useMediaQuery } from '@mui/material'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import MobileStepper from '@mui/material/MobileStepper'
import Slide from '@mui/material/Slide'

import { useTheme } from '@mui/material/styles'
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
  const [prevStep, setPrevStep] = useState(0)
  const [setTutorialInDb] = useMutation(Query.user('setTutorial'))

  const handleNext = () => {
    setPrevStep(activeStep)
    setActiveStep((prevActiveStep) => prevActiveStep + 1)
  }

  const handleBack = () => {
    setPrevStep(activeStep)
    setActiveStep((prevActiveStep) => prevActiveStep - 1)
  }

  const handleTutClose = () => {
    setTutorial(false)
    setTutorialInDb({ variables: { tutorial: true } })
  }

  return (
    <>
      <Header titles={['tutorial', steps[activeStep] || 'closing']} />
      {/* {getStepContent(activeStep)} */}
      {[0, 1, 2, 3, 4, 5].map((step) => (
        <Slide
          key={step}
          in={activeStep === step}
          direction={step > prevStep ? 'left' : 'right'}
          mountOnEnter
          unmountOnExit
          style={{ flexGrow: 1 }}
        >
          <Box display={activeStep === step ? 'block' : 'none'}>
            {
              {
                0: <Welcome setUserProfile={setUserProfile} />,
                1: <Sidebar isMobile={isMobile} toggleDialog={toggleDialog} />,
                2: <Sliders isMobile={isMobile} />,
                3: <Advanced isMobile={isMobile} />,
                4: <Popups />,
                5: <Closing />,
              }[step]
            }
          </Box>
        </Slide>
      ))}
      {/* <Slide in={activeStep === 1} direction="left" mountOnEnter unmountOnExit>
        <Box>
          <Sidebar isMobile={isMobile} toggleDialog={toggleDialog} />
        </Box>
      </Slide>
      <Slide in={activeStep === 2} direction="left" mountOnEnter unmountOnExit>
        <Box>
          <Sliders isMobile={isMobile} />
        </Box>
      </Slide> */}
      <DialogActions>
        <MobileStepper
          variant="text"
          steps={steps.length}
          position="static"
          activeStep={activeStep}
          style={{ flexGrow: 1 }}
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

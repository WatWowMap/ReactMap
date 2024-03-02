import React, { useState } from 'react'
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft'
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight'
import { Box, Dialog, useMediaQuery } from '@mui/material'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import MobileStepper from '@mui/material/MobileStepper'
import Slide from '@mui/material/Slide'
import { useTheme } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@apollo/client'

import { useMemory } from '@hooks/useMemory'
import { useStorage } from '@hooks/useStorage'
import Query from '@services/Query'
import Header from '@components/general/Header'

import Welcome from './Welcome'
import Advanced from './Advanced'
import Closing from './Closing'
import Sidebar from './Sidebar'
import Sliders from './Sliders'
import Popups from './Popups'

const steps = ['intro', 'sidebar', 'sliders', 'advanced', 'popups', 'closing']

export default function Tutorial() {
  const theme = useTheme()
  const { t } = useTranslation()
  const isMobile = useMediaQuery(theme.breakpoints.only('xs'))
  const tutorial = useStorage((s) => s.tutorial)
  const enableTutorial = useMemory((s) => s.config.misc.enableTutorial)

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
    useStorage.setState({ tutorial: false })
    setTutorialInDb({ variables: { tutorial: true } })
  }

  return (
    <Dialog
      fullScreen={isMobile}
      maxWidth="xs"
      open={tutorial && enableTutorial}
      onClose={handleTutClose}
    >
      <Header
        titles={['tutorial', steps[activeStep] || 'closing']}
        action={handleTutClose}
      />
      {[0, 1, 2, 3, 4, 5].map((step) => (
        <Slide
          key={step}
          in={activeStep === step}
          direction={step > prevStep ? 'left' : 'right'}
          mountOnEnter
          unmountOnExit
        >
          <Box
            display={activeStep === step ? 'block' : 'none'}
            sx={{
              flexGrow: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              height: { xs: '100%', sm: '90vh' },
            }}
          >
            {
              {
                0: <Welcome />,
                1: <Sidebar />,
                2: <Sliders />,
                3: <Advanced category="pokemon" />,
                4: <Popups />,
                5: <Closing />,
              }[step]
            }
          </Box>
        </Slide>
      ))}
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
    </Dialog>
  )
}

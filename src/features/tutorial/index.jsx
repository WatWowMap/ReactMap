// @ts-check

import { useMutation } from '@apollo/client'
import { Header } from '@components/dialogs/Header'
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft'
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import MobileStepper from '@mui/material/MobileStepper'
import Slide from '@mui/material/Slide'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import { Query } from '@services/queries'

import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TutorialAdvanced } from './Advanced'
import { TutorialClosing } from './Closing'
import { TutorialPopup } from './Popups'
import { TutorialSidebar } from './Sidebar'
import { TutorialSliders } from './Sliders'
import { TutorialWelcome } from './Welcome'

const steps = ['intro', 'sidebar', 'sliders', 'advanced', 'popups', 'closing']

export function Tutorial() {
  const theme = useTheme()
  const { t } = useTranslation()
  const isMobile = useMediaQuery(theme.breakpoints.only('xs'))
  const tutorial = useStorage((s) => s.tutorial)
  const enableTutorial = useMemory((s) => s.config.misc.enableTutorial)

  const [activeStep, setActiveStep] = useState(0)
  const [prevStep, setPrevStep] = useState(0)

  const [setTutorialInDb] = useMutation(Query.user('SET_TUTORIAL'))

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
                0: <TutorialWelcome />,
                1: <TutorialSidebar />,
                2: <TutorialSliders />,
                3: <TutorialAdvanced category="pokemon" />,
                4: <TutorialPopup isMobile={isMobile} />,
                5: <TutorialClosing />,
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

export * from './Advanced'

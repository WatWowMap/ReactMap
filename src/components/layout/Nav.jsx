import React, { useState } from 'react'
import { Dialog, Snackbar } from '@material-ui/core'
import { Alert } from '@material-ui/lab'

import Utility from '@services/Utility'
import useStyles from '@hooks/useStyles'
import { useStore, useStatic } from '@hooks/useStore'
import SlideTransition from '@assets/mui/SlideTransition'

import FloatingBtn from './FloatingBtn'
import Sidebar from './drawer/Drawer'
import FilterMenu from './dialogs/filters/FilterMenu'
import UserOptions from './dialogs/UserOptions'
import Tutorial from './dialogs/tutorial/Tutorial'
import UserProfile from './dialogs/UserProfile'
import Search from './dialogs/Search'
import Motd from './dialogs/Motd'
import DonorPage from './dialogs/DonorPage'
import Feedback from './dialogs/Feedback'
import ResetFilters from './dialogs/ResetFilters'

export default function Nav({
  map,
  setManualParams,
  Icons,
  setWebhookMode,
  webhookMode,
  settings,
  webhooks,
  setScanNextMode,
  scanNextMode,
  setScanZoneMode,
  scanZoneMode,
  isMobile,
  isTablet,
}) {
  const classes = useStyles()
  const {
    auth: { perms },
    setWebhookAlert,
    config,
    setUserProfile,
    setFeedback,
    setResetFilters,
  } = useStatic.getState()
  const { setFilters, setUserSettings, setTutorial, setMotdIndex } =
    useStore.getState()

  const webhookAlert = useStatic((s) => s.webhookAlert)
  const userProfile = useStatic((s) => s.userProfile)
  const feedback = useStatic((s) => s.feedback)
  const resetFilters = useStatic((s) => s.resetFilters)

  const filters = useStore((s) => s.filters)
  const userSettings = useStore((s) => s.userSettings)
  const tutorial = useStore((s) => s.tutorial)
  const motdIndex = useStore((s) => s.motdIndex)

  const [drawer, setDrawer] = useState(false)
  const [donorPage, setDonorPage] = useState(false)
  const [dialog, setDialog] = useState({
    open: false,
    category: '',
    type: '',
  })
  const [motd, setMotd] = useState(
    config.map.messageOfTheDay.components?.length &&
      (config.map.messageOfTheDay.index > motdIndex ||
        config.map.messageOfTheDay.settings.permanent) &&
      ((perms.donor
        ? config.map.messageOfTheDay.settings.donorOnly
        : config.map.messageOfTheDay.settings.freeloaderOnly) ||
        (!config.map.messageOfTheDay.settings.donorOnly &&
          !config.map.messageOfTheDay.settings.freeloaderOnly)),
  )

  const toggleDrawer = (open) => (event) => {
    if (
      event.type === 'keydown' &&
      (event.key === 'Tab' || event.key === 'Shift')
    ) {
      return
    }
    setDrawer(open)
  }

  const handleMotdClose = () => {
    if (!config.map.messageOfTheDay.settings.permanent) {
      setMotdIndex(config.map.messageOfTheDay.index)
    }
    setMotd(false)
  }

  const toggleDialog = (open, category, type, filter) => (event) => {
    Utility.analytics(
      'Menu Toggle',
      `Open: ${open}`,
      `Category: ${category} Menu: ${type}`,
    )
    if (
      event.type === 'keydown' &&
      (event.key === 'Tab' || event.key === 'Shift')
    ) {
      return
    }
    setDialog({ open, category, type })
    if (filter && type === 'search') {
      setManualParams({ id: filter.id })
      map.flyTo([filter.lat, filter.lon], 16)
    }
    if (filter && type === 'filters') {
      setFilters({ ...filters, [category]: { ...filters[category], filter } })
    }
    if (filter && type === 'options') {
      setUserSettings({ ...userSettings, [category]: filter })
    }
  }

  return (
    <>
      {drawer ? (
        <Sidebar
          drawer={drawer}
          toggleDrawer={toggleDrawer}
          toggleDialog={toggleDialog}
        />
      ) : (
        <FloatingBtn
          toggleDrawer={toggleDrawer}
          toggleDialog={toggleDialog}
          safeSearch={config.map.searchable}
          isMobile={isMobile}
          webhooks={webhooks}
          webhookMode={webhookMode}
          setWebhookMode={setWebhookMode}
          scanNextMode={scanNextMode}
          setScanNextMode={setScanNextMode}
          scanZoneMode={scanZoneMode}
          setScanZoneMode={setScanZoneMode}
          settings={settings}
          donationPage={config.map.donationPage}
          setDonorPage={setDonorPage}
          setUserProfile={setUserProfile}
        />
      )}
      <Dialog
        open={userProfile}
        fullScreen={isMobile}
        fullWidth={!isMobile}
        onClose={() => setUserProfile(false)}
      >
        <UserProfile
          setUserProfile={setUserProfile}
          isMobile={isMobile}
          isTablet={isTablet}
        />
      </Dialog>
      <Dialog
        open={tutorial && config.map.enableTutorial}
        fullScreen={isMobile}
        maxWidth="xs"
        onClose={() => setTutorial(false)}
      >
        <Tutorial
          setUserProfile={setUserProfile}
          setTutorial={setTutorial}
          toggleDialog={toggleDialog}
        />
      </Dialog>
      <Dialog
        fullWidth={!isMobile}
        fullScreen={isMobile}
        maxWidth="md"
        open={dialog.open && dialog.type === 'filters'}
        onClose={toggleDialog(false, dialog.category, dialog.type)}
      >
        <FilterMenu
          toggleDialog={toggleDialog}
          filters={filters[dialog.category]}
          category={dialog.category}
          isMobile={isMobile}
          isTablet={isTablet}
        />
      </Dialog>
      <Dialog
        maxWidth="sm"
        open={dialog.open && dialog.type === 'options'}
        onClose={toggleDialog(false, dialog.category, dialog.type)}
      >
        <UserOptions
          toggleDialog={toggleDialog}
          category={dialog.category}
          isMobile={isMobile}
        />
      </Dialog>
      <Dialog
        fullScreen={isMobile}
        classes={{
          scrollPaper: classes.scrollPaper,
          container: classes.container,
        }}
        open={dialog.open && dialog.type === 'search'}
        onClose={toggleDialog(false, dialog.category, dialog.type)}
      >
        <Search
          toggleDialog={toggleDialog}
          safeSearch={config.map.searchable}
          isMobile={isMobile}
          Icons={Icons}
        />
      </Dialog>
      <Dialog
        maxWidth={config.map.messageOfTheDay.dialogMaxWidth || 'sm'}
        open={Boolean(motd && !tutorial)}
        onClose={handleMotdClose}
      >
        <Motd
          motd={config.map.messageOfTheDay}
          perms={perms}
          handleMotdClose={handleMotdClose}
        />
      </Dialog>
      <Dialog open={donorPage} onClose={() => setDonorPage(false)}>
        <DonorPage
          donorPage={config.map.donationPage}
          handleDonorClose={() => setDonorPage(false)}
        />
      </Dialog>
      <Dialog
        open={feedback}
        maxWidth={isMobile ? 'sm' : 'xs'}
        onClose={() => setFeedback(false)}
      >
        <Feedback link={config.map.feedbackLink} setFeedback={setFeedback} />
      </Dialog>
      <Dialog
        open={resetFilters}
        maxWidth={isMobile ? 'sm' : 'xs'}
        onClose={() => setResetFilters(false)}
      >
        <ResetFilters />
      </Dialog>
      <Snackbar
        open={Boolean(webhookAlert.open)}
        onClose={() =>
          setWebhookAlert({ open: false, severity: 'info', message: '' })
        }
        TransitionComponent={SlideTransition}
      >
        <Alert
          onClose={() =>
            setWebhookAlert({ open: false, severity: 'info', message: '' })
          }
          severity={webhookAlert.severity}
          variant="filled"
          style={{ whiteSpace: 'pre-line', textAlign: 'center' }}
        >
          {webhookAlert.message}
        </Alert>
      </Snackbar>
    </>
  )
}

import React, { useState } from 'react'
import { Dialog, useMediaQuery, Snackbar } from '@material-ui/core'
import { Alert } from '@material-ui/lab'
import { useTheme } from '@material-ui/styles'

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

const searchable = ['quests', 'pokestops', 'raids', 'gyms', 'portals', 'nests']

export default function Nav({
  map, setManualParams, Icons, config,
  setWebhookMode, webhookMode, settings, webhooks,
}) {
  const classes = useStyles()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.only('xs'))
  const isTablet = useMediaQuery(theme.breakpoints.only('sm'))

  const { perms } = useStatic(state => state.auth)
  const webhookAlert = useStatic(state => state.webhookAlert)
  const setWebhookAlert = useStatic(state => state.setWebhookAlert)
  const { map: { messageOfTheDay, donationPage, defaultQuestSet } } = useStatic(state => state.config)
  const userProfile = useStatic(state => state.userProfile)
  const setUserProfile = useStatic(state => state.setUserProfile)
  const feedback = useStatic(state => state.feedback)
  const setFeedback = useStatic(state => state.setFeedback)

  const filters = useStore(state => state.filters)
  const setFilters = useStore(state => state.setFilters)
  const userSettings = useStore(state => state.userSettings)
  const setUserSettings = useStore(state => state.setUserSettings)
  const tutorial = useStore(state => state.tutorial)
  const setTutorial = useStore(state => state.setTutorial)
  const motdIndex = useStore(state => state.motdIndex)
  const setMotdIndex = useStore(s => s.setMotdIndex)

  const [drawer, setDrawer] = useState(false)
  const [dialog, setDialog] = useState({
    open: false,
    category: '',
    type: '',
  })
  const [motd, setMotd] = useState(
    messageOfTheDay.components.length
    && (messageOfTheDay.index > motdIndex || messageOfTheDay.settings.permanent)
    && ((perms.donor ? messageOfTheDay.settings.donorOnly : messageOfTheDay.settings.freeloaderOnly)
      || (!messageOfTheDay.settings.donorOnly && !messageOfTheDay.settings.freeloaderOnly)),
  )
  const [donorPage, setDonorPage] = useState(false)

  const safeSearch = searchable.filter(category => perms[category])

  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return
    }
    setDrawer(open)
  }

  const handleMotdClose = () => {
    if (!messageOfTheDay.settings.permanent) {
      setMotdIndex(messageOfTheDay.index)
    }
    setMotd(false)
  }

  const toggleDialog = (open, category, type, filter) => (event) => {
    Utility.analytics('Menu Toggle', `Open: ${open}`, `Category: ${category} Menu: ${type}`)
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
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

  if (!filters['pokestops'].showQuestSet) {
    setFilters({ ...filters, pokestops: { ...filters['pokestops'], showQuestSet: defaultQuestSet } })
  }

  return (
    <>
      {drawer ? (
        <Sidebar
          drawer={drawer}
          toggleDrawer={toggleDrawer}
          filters={filters}
          setFilters={setFilters}
          toggleDialog={toggleDialog}
          Icons={Icons}
        />
      ) : (
        <FloatingBtn
          toggleDrawer={toggleDrawer}
          toggleDialog={toggleDialog}
          safeSearch={safeSearch}
          isMobile={isMobile}
          perms={perms}
          webhooks={webhooks}
          webhookMode={webhookMode}
          setWebhookMode={setWebhookMode}
          settings={settings}
          donationPage={donationPage}
          setDonorPage={setDonorPage}
        />
      )}
      {userProfile ? (
        <Dialog
          open={userProfile}
          fullScreen={isMobile}
          fullWidth={!isMobile}
        >
          <UserProfile setUserProfile={setUserProfile} />
        </Dialog>
      ) : (
        <Dialog
          open={tutorial}
          fullScreen={isMobile}
          maxWidth="xs"
        >
          <Tutorial
            setUserProfile={setUserProfile}
            setTutorial={setTutorial}
            toggleDialog={toggleDialog}
          />
        </Dialog>
      )}
      <Dialog
        fullWidth={!isMobile}
        fullScreen={isMobile}
        maxWidth="md"
        open={dialog.open && dialog.type === 'filters'}
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
      >
        <Search
          toggleDialog={toggleDialog}
          safeSearch={safeSearch}
          isMobile={isMobile}
          Icons={Icons}
        />
      </Dialog>
      <Dialog
        maxWidth="sm"
        open={Boolean(motd && !tutorial)}
      >
        <Motd
          motd={messageOfTheDay}
          perms={perms}
          handleMotdClose={handleMotdClose}
        />
      </Dialog>
      <Dialog
        open={donorPage}
      >
        <DonorPage
          donorPage={donationPage}
          handleDonorClose={() => setDonorPage(false)}
        />
      </Dialog>
      <Dialog
        open={feedback}
        maxWidth={isMobile ? 'sm' : 'xs'}
      >
        <Feedback link={config.feedbackLink} setFeedback={setFeedback} />
      </Dialog>
      <Snackbar
        open={Boolean(webhookAlert.open)}
        onClose={() => setWebhookAlert({ open: false, severity: 'info', message: '' })}
        TransitionComponent={SlideTransition}
      >
        <Alert
          onClose={() => setWebhookAlert({ open: false, severity: 'info', message: '' })}
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

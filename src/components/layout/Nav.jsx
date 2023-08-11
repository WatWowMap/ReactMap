import * as React from 'react'
import Dialog from '@mui/material/Dialog'

import Utility from '@services/Utility'
import { useStore, useStatic } from '@hooks/useStore'

import FloatingBtn from './FloatingBtn'
import Sidebar from './drawer/Drawer'
import FilterMenu from './dialogs/filters/FilterMenu'
import UserOptions from './dialogs/UserOptions'
import Tutorial from './dialogs/tutorial/Tutorial'
import UserProfile from './dialogs/UserProfile'
import Search from './dialogs/Search'
import MessageOfTheDay from './dialogs/Motd'
import DonorPage from './dialogs/DonorPage'
import Feedback from './dialogs/Feedback'
import ResetFilters from './dialogs/ResetFilters'
import Notification from './general/Notification'

export default function Nav({
  webhookMode,
  setWebhookMode,
  scanNextMode,
  setScanNextMode,
  scanZoneMode,
  setScanZoneMode,
}) {
  const { setWebhookAlert, config } = useStatic.getState()

  const webhookAlert = useStatic((s) => s.webhookAlert)
  const isMobile = useStatic((s) => s.isMobile)
  const isTablet = useStatic((s) => s.isTablet)

  const filters = useStore((s) => s.filters)
  const tutorial = useStore((s) => s.tutorial)

  const [dialog, setDialog] = React.useState({
    open: false,
    category: '',
    type: '',
  })

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
    if (filter && type === 'filters') {
      useStore.setState((prev) => ({
        filters: {
          ...prev.filters,
          [category]: { ...prev.filters[category], filter },
        },
      }))
    }
    if (filter && type === 'options') {
      useStore.setState((prev) => ({
        userSettings: {
          ...prev.userSettings,
          [category]: filter,
        },
      }))
    }
  }

  return (
    <>
      <Sidebar toggleDialog={toggleDialog} />
      <FloatingBtn
        webhookMode={webhookMode}
        setWebhookMode={setWebhookMode}
        scanNextMode={scanNextMode}
        setScanNextMode={setScanNextMode}
        scanZoneMode={scanZoneMode}
        setScanZoneMode={setScanZoneMode}
      />
      <UserProfile />
      <Dialog
        open={tutorial && config.map.enableTutorial}
        fullScreen={isMobile}
        maxWidth="xs"
        onClose={() => useStore.setState({ tutorial: false })}
      >
        <Tutorial
          setTutorial={(tut) => useStore.setState({ tutorial: tut })}
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
        fullScreen={isMobile}
        maxWidth="md"
        open={dialog.open && dialog.type === 'options'}
        onClose={toggleDialog(false, dialog.category, dialog.type)}
      >
        <UserOptions
          toggleDialog={toggleDialog}
          category={dialog.category}
          isMobile={isMobile}
        />
      </Dialog>
      <Search />
      <MessageOfTheDay />
      <DonorPage />
      <Feedback />
      <ResetFilters />
      <Notification
        open={!!webhookAlert.open}
        cb={() =>
          setWebhookAlert({
            open: false,
            severity: webhookAlert.severity,
            message: '',
          })
        }
        severity={webhookAlert.severity}
        messages={[webhookAlert.message]}
      />
    </>
  )
}

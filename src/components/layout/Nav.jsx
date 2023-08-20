import * as React from 'react'

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
import ScanDialog from './dialogs/scanner/ScanDialog'
import Webhook from './dialogs/webhooks/Webhook'
import ClientError from './dialogs/ClientError'
import { WebhookNotification } from './dialogs/webhooks/Notification'

export default function Nav() {
  return (
    <>
      <Sidebar />
      <FloatingBtn />
      <UserProfile />
      <Tutorial />
      <FilterMenu />
      <UserOptions />
      <Webhook />
      <Search />
      <MessageOfTheDay />
      <DonorPage />
      <Feedback />
      <ResetFilters />
      <ScanDialog />
      <WebhookNotification />
      <ClientError />
    </>
  )
}

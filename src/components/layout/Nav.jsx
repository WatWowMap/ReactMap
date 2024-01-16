import * as React from 'react'

import { useMemory } from '@hooks/useMemory'

import { FloatingButtonsMemo } from './FloatingBtn'
import Sidebar from './drawer/Drawer'
import FilterMenu from './dialogs/filters/FilterMenu'
import UserOptions from './dialogs/UserOptions'
import Tutorial from './dialogs/tutorial/Tutorial'
import UserProfile from './dialogs/profile'
import Search from './dialogs/Search'
import MessageOfTheDay from './dialogs/Motd'
import DonorPage from './dialogs/DonorPage'
import Feedback from './dialogs/Feedback'
import ResetFilters from './dialogs/ResetFilters'
import ScanDialog from './dialogs/scanner/ScanDialog'
import Webhook from './dialogs/webhooks/Webhook'
import ClientError from './dialogs/ClientError'
import { WebhookNotification } from './dialogs/webhooks/Notification'
import AdvancedFilter from './dialogs/filters/Advanced'
import BadgeSelection from './dialogs/BadgeSelection'
import WebhookAdvanced from './dialogs/webhooks/WebhookAdv'
import SlotSelection from './dialogs/filters/SlotSelection'
import { HelpDialog } from './dialogs/Help'

export const Nav = React.memo(
  () => {
    const iconsIsReady = useMemory((s) => !!s.Icons)
    if (!iconsIsReady) return null
    return (
      <>
        <Sidebar />
        <FloatingButtonsMemo />
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
        <AdvancedFilter />
        <BadgeSelection />
        <WebhookAdvanced />
        <SlotSelection />
        <HelpDialog />
      </>
    )
  },
  () => true,
)

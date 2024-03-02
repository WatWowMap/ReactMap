import * as React from 'react'

import { useMemory } from '@hooks/useMemory'

import Sidebar from '@components/layout/drawer/Drawer'
import FilterMenu from '@components/layout/dialogs/filters/FilterMenu'
import UserOptions from '@components/layout/dialogs/UserOptions'
import Tutorial from '@components/layout/dialogs/tutorial/Tutorial'
import UserProfile from '@components/layout/dialogs/profile'
import Search from '@components/layout/dialogs/search'
import MessageOfTheDay from '@components/layout/dialogs/Motd'
import DonorPage from '@components/layout/dialogs/DonorPage'
import Feedback from '@components/layout/dialogs/Feedback'
import ResetFilters from '@components/layout/dialogs/ResetFilters'
import ScanDialog from '@features/scanner/ScanDialog'
import Webhook from '@components/layout/dialogs/webhooks/Webhook'
import ClientError from '@components/layout/dialogs/ClientError'
import { WebhookNotification } from '@components/layout/dialogs/webhooks/Notification'
import AdvancedFilter from '@components/layout/dialogs/filters/Advanced'
import BadgeSelection from '@components/layout/dialogs/BadgeSelection'
import WebhookAdvanced from '@components/layout/dialogs/webhooks/WebhookAdv'
import SlotSelection from '@components/layout/dialogs/filters/SlotSelection'
import { HelpDialog } from '@components/layout/dialogs/Help'
import { PkmnFilterHelp } from '@components/layout/dialogs/filters/PkmnFilterHelp'
import { FloatingButtonsMemo } from './FloatingBtn'

export const Nav = React.memo(
  () => {
    const iconsIsReady = useMemory((s) => !!s.Icons)
    return (
      <>
        <ClientError />
        {iconsIsReady && (
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
            <AdvancedFilter />
            <BadgeSelection />
            <WebhookAdvanced />
            <SlotSelection />
            <HelpDialog />
            <PkmnFilterHelp />
          </>
        )}
      </>
    )
  },
  () => true,
)

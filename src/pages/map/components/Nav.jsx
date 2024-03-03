import * as React from 'react'

import { useMemory } from '@hooks/useMemory'

import Drawer from '@features/drawer'
import FilterMenu from '@components/dialogs/filters/FilterMenu'
import UserOptions from '@components/dialogs/UserOptions'
import Tutorial from '@features/tutorial'
import UserProfile from '@features/profile'
import Search from '@features/search'
import MessageOfTheDay from '@features/builder/Motd'
import DonorPage from '@features/builder/DonorPage'
import Feedback from '@components/dialogs/Feedback'
import ResetFilters from '@components/dialogs/ResetFilters'
import ScanDialog from '@features/scanner/ScanDialog'
import Webhook from '@features/webhooks/Webhook'
import ClientError from '@components/dialogs/ClientError'
import { WebhookNotification } from '@features/webhooks/Notification'
import AdvancedFilter from '@components/dialogs/filters/Advanced'
import BadgeSelection from '@components/dialogs/BadgeSelection'
import WebhookAdvanced from '@features/webhooks/WebhookAdv'
import SlotSelection from '@components/dialogs/filters/SlotSelection'
import { HelpDialog } from '@components/dialogs/Help'
import { PkmnFilterHelp } from '@components/dialogs/filters/PkmnFilterHelp'
import { FloatingButtonsMemo } from './FloatingBtn'

export const Nav = React.memo(
  () => {
    const iconsIsReady = useMemory((s) => !!s.Icons)
    return (
      <>
        <ClientError />
        {iconsIsReady && (
          <>
            <Drawer />
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

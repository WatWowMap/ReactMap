// @ts-check
import * as React from 'react'

import Tutorial from '@features/tutorial'
import UserProfile from '@features/profile'
import Drawer from '@features/drawer'
import Search from '@features/search'
import Webhook from '@features/webhooks'
import { DonorPage, MessageOfTheDay } from '@features/builder'
import ScanDialog from '@features/scanner/ScanDialog'
import { WebhookNotification } from '@features/webhooks/Notification'
import Feedback from '@components/dialogs/Feedback'
import FilterMenu from '@components/dialogs/filters/FilterMenu'
import UserOptions from '@components/dialogs/UserOptions'
import ResetFilters from '@components/dialogs/ResetFilters'
import ClientError from '@components/dialogs/ClientError'
import AdvancedFilter from '@components/dialogs/filters/Advanced'
import BadgeSelection from '@components/dialogs/BadgeSelection'
import WebhookAdvanced from '@features/webhooks/WebhookAdv'
import SlotSelection from '@components/dialogs/filters/SlotSelection'
import { HelpDialog } from '@components/dialogs/Help'
import { PkmnFilterHelp } from '@components/dialogs/filters/PkmnFilterHelp'
import { useMemory } from '@hooks/useMemory'

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

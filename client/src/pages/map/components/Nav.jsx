// @ts-check
import * as React from 'react'

import { Tutorial } from '@features/tutorial'
import { UserProfile } from '@features/profile'
import { Search } from '@features/search'
import {
  Webhook,
  WebhookNotification,
  WebhookAdvanced,
} from '@features/webhooks'
import { DonorPage, MessageOfTheDay } from '@features/builder'
import { ScanDialog } from '@features/scanner'
import { Feedback } from '@components/dialogs/Feedback'
import { FilterMenu } from '@components/filters/FilterMenu'
import { UserOptions } from '@components/dialogs/UserOptions'
import { ResetFilters } from '@components/dialogs/ResetFilters'
import { ClientError } from '@components/dialogs/ClientError'
import { AdvancedFilter } from '@components/filters/Advanced'
import { BadgeSelection } from '@components/dialogs/BadgeSelection'
import { SlotSelection } from '@components/filters/SlotSelection'
import { HelpDialog } from '@components/dialogs/Help'
import { NestSubmission } from '@components/dialogs/NestSubmission'
import { Drawer, PkmnFilterHelp } from '@features/drawer'
import { useMemory } from '@store/useMemory'

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
            <NestSubmission />
          </>
        )}
      </>
    )
  },
  () => true,
)

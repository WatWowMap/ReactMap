// @ts-check

import { BadgeSelection } from '@components/dialogs/BadgeSelection'
import { ClientError } from '@components/dialogs/ClientError'
import { Feedback } from '@components/dialogs/Feedback'
import { HelpDialog } from '@components/dialogs/Help'
import { NestSubmission } from '@components/dialogs/NestSubmission'
import { ResetFilters } from '@components/dialogs/ResetFilters'
import { UserOptions } from '@components/dialogs/UserOptions'
import { AdvancedFilter } from '@components/filters/Advanced'
import { FilterMenu } from '@components/filters/FilterMenu'
import { SlotSelection } from '@components/filters/SlotSelection'
import { DonorPage, MessageOfTheDay } from '@features/builder'
import { Drawer, PkmnFilterHelp } from '@features/drawer'
import { UserProfile } from '@features/profile'
import { ScanDialog } from '@features/scanner'
import { Search } from '@features/search'
import { Tutorial } from '@features/tutorial'
import {
  Webhook,
  WebhookAdvanced,
  WebhookNotification,
} from '@features/webhooks'
import { useMemory } from '@store/useMemory'
import * as React from 'react'

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

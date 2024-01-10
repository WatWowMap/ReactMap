import * as React from 'react'
import { DialogContent, AppBar, Tabs, Tab, Box } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { useLayoutStore, useMemory } from '@hooks/useMemory'
import Utility from '@services/Utility'

import Header from '../../general/Header'
import Footer from '../../general/Footer'
import TabPanel from '../../general/TabPanel'
import { DialogWrapper } from '../DialogWrapper'
import { UserBackups } from './Backups'
import { UserPermissions } from './Permissions'
import { UserGymBadges } from './GymBadges'
import { LinkAccounts } from './LinkAccounts'
import { ExtraUserFields } from './ExtraFields'

export default function UserProfile() {
  Utility.analytics('/user-profile')
  const { t } = useTranslation()
  const auth = useMemory((state) => state.auth)
  const { rolesLinkName, rolesLink } = useMemory((state) => state.config.links)

  const locale = localStorage.getItem('i18nextLng') || 'en'

  const [tab, setTab] = React.useState(0)
  const [tabsHeight, setTabsHeight] = React.useState(0)
  const handleTabChange = (_event, newValue) => {
    setTab(newValue)
  }

  const handleClose = React.useCallback(
    () => useLayoutStore.setState({ userProfile: false }),
    [],
  )

  return (
    <DialogWrapper dialog="userProfile">
      <Header
        titles={['user_profile', `- ${auth.username}`]}
        action={handleClose}
      />
      <DialogContent sx={{ p: 0 }}>
        <AppBar
          position="static"
          ref={(ref) => ref && setTabsHeight(ref.clientHeight)}
        >
          <Tabs value={tab} onChange={handleTabChange}>
            {['profile', 'badges', 'access'].map((each) => (
              <Tab key={each} label={t(each)} />
            ))}
          </Tabs>
        </AppBar>
        <Box
          overflow="auto"
          maxHeight={{
            xs: `calc(100% - ${tabsHeight}px)`,
            sm: `calc(75vh - ${tabsHeight}px)`,
          }}
          minHeight="70vh"
        >
          <TabPanel value={tab} index={0}>
            <LinkAccounts />
            <ExtraUserFields />
            <UserBackups />
          </TabPanel>
          <TabPanel value={tab} index={1}>
            <UserGymBadges />
          </TabPanel>
          <TabPanel value={tab} index={2}>
            <UserPermissions />
          </TabPanel>
        </Box>
      </DialogContent>
      <Footer
        options={[
          rolesLink
            ? {
                name:
                  typeof rolesLinkName === 'string'
                    ? rolesLinkName
                    : rolesLinkName[locale] || Object.values(rolesLinkName)[0],
                link: rolesLink,
                color: 'primary',
              }
            : {},
          {
            name: 'close',
            color: 'secondary',
            action: handleClose,
          },
        ]}
      />
    </DialogWrapper>
  )
}

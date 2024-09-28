import * as React from 'react'
import { useTranslation } from 'react-i18next'
import TabContext from '@mui/lab/TabContext'
import TabList, { TabListProps } from '@mui/lab/TabList'
import TabPanel from '@mui/lab/TabPanel'
import Tab from '@mui/material/Tab'
import Box from '@mui/material/Box'
import DialogContent from '@mui/material/DialogContent'
import { useMemory } from '@store/useMemory'
import { useLayoutStore } from '@store/useLayoutStore'
import { Header } from '@components/dialogs/Header'
import { Footer } from '@components/dialogs/Footer'
import { DialogWrapper } from '@components/dialogs/DialogWrapper'
import { useAnalytics } from '@hooks/useAnalytics'

import { UserBackups } from './Backups'
import { UserPermissions } from './Permissions'
import { UserGymBadges } from './GymBadges'
import { LinkAccounts } from './LinkAccounts'
import { ExtraUserFields } from './ExtraFields'

export function UserProfile() {
  useAnalytics('/user-profile')
  const { t } = useTranslation()
  const auth = useMemory((s) => s.auth)
  const { rolesLinkName, rolesLink } = useMemory((s) => s.config.links)

  const locale = localStorage.getItem('i18nextLng') || 'en'

  const [tab, setTab] = React.useState('profile')
  const [tabsHeight, setTabsHeight] = React.useState(0)

  const handleTabChange: TabListProps['onChange'] = (_event, newValue) => {
    setTab(newValue)
  }

  const handleClose = React.useCallback(
    () => useLayoutStore.setState({ userProfile: false }),
    [],
  )

  return (
    <DialogWrapper dialog="userProfile">
      <Header
        action={handleClose}
        titles={['user_profile', `- ${auth.username}`]}
      />
      <DialogContent sx={{ p: 0 }}>
        <TabContext value={tab}>
          <TabList
            ref={(ref) => ref && setTabsHeight(ref.clientHeight)}
            onChange={handleTabChange}
          >
            {['profile', 'badges', 'access'].map((each) => (
              <Tab key={each} label={t(each)} value={each} />
            ))}
          </TabList>
          <Box
            height={{
              xs: `calc(100% - ${tabsHeight}px)`,
              sm: `calc(70vh - ${tabsHeight}px)`,
            }}
            overflow="auto"
          >
            <TabPanel value="profile">
              <LinkAccounts />
              <ExtraUserFields />
              <UserBackups />
            </TabPanel>
            <TabPanel sx={{ height: '100%', px: 0 }} value="badges">
              <Box className="profile-container">
                <UserGymBadges />
              </Box>
            </TabPanel>
            <TabPanel value="access">
              <UserPermissions />
            </TabPanel>
          </Box>
        </TabContext>
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

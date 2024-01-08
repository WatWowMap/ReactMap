import * as React from 'react'
import {
  Grid,
  Typography,
  DialogContent,
  AppBar,
  Tabs,
  Tab,
  Select,
  MenuItem,
  IconButton,
  TextField,
  Button,
  Box,
} from '@mui/material'
import Edit from '@mui/icons-material/Edit'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery } from '@apollo/client'
import { useMap } from 'react-leaflet'

import { useLayoutStore, useStatic } from '@hooks/useStore'
import Utility from '@services/Utility'
import Query from '@services/Query'

import Header from '../general/Header'
import Footer from '../general/Footer'
import TabPanel from '../general/TabPanel'
import DiscordLogin from '../auth/Discord'
import Telegram from '../auth/Telegram'
import Notification from '../general/Notification'
import { DialogWrapper } from './DialogWrapper'
import { VirtualGrid } from '../general/VirtualGrid'
import { Img } from '../general/Img'
import { UserBackups } from './profile/Backups'
import { UserPermissions } from './profile/Permissions'

export default function UserProfile() {
  Utility.analytics('/user-profile')
  const { t } = useTranslation()
  const auth = useStatic((state) => state.auth)
  const { rolesLinkName, rolesLink } = useStatic((state) => state.config.links)

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
            <LinkProfiles />
            <ExtraFields />
            <UserBackups />
          </TabPanel>
          <TabPanel value={tab} index={1}>
            <GymBadges />
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

const LinkProfiles = () => {
  const { t } = useTranslation()
  const auth = useStatic((s) => s.auth)
  const { discordAuthUrl, telegramAuthUrl, telegramBotName } = useStatic(
    (state) => state.config.customRoutes,
  )

  const [refreshing, setRefreshing] = React.useState(false)

  const [setWebhookStrategy] = useMutation(Query.user('setWebhookStrategy'))

  if (refreshing) {
    setTimeout(() => window.location.reload(), 2000)
  }

  return (
    <>
      <Grid container alignItems="center" justifyContent="center">
        {['discord', 'telegram'].map((method, i) => {
          if (!auth.methods.includes(method)) return null
          const Component = i ? (
            <Telegram authUrl={telegramAuthUrl} botName={telegramBotName} />
          ) : (
            <DiscordLogin
              href={discordAuthUrl}
              text="link_discord"
              size="medium"
            />
          )
          return (
            <Grid item xs={12} key={method} align="center">
              {auth[`${method}Id`] ? (
                <Typography color="secondary">
                  {t('user_username')}: {auth.username} ({t(`${method}_linked`)}
                  )
                </Typography>
              ) : (
                Component
              )}
            </Grid>
          )
        })}
        {auth.discordId && auth.telegramId && (
          <Grid container item alignItems="center" justifyContent="center">
            <Grid
              item
              xs={6}
              sm={6}
              md={5}
              style={{ textAlign: 'center', padding: '20px 0' }}
            >
              <Typography>{t('select_webhook_strategy')}</Typography>
            </Grid>
            <Grid item xs={6} sm={6} md={5} style={{ textAlign: 'center' }}>
              <Select
                value={auth.webhookStrategy || ''}
                onChange={(e) => {
                  setWebhookStrategy({
                    variables: {
                      strategy: e.target.value,
                    },
                  })
                  useStatic.setState({
                    auth: { ...auth, webhookStrategy: e.target.value },
                  })
                  setRefreshing(true)
                }}
                style={{ minWidth: 100 }}
              >
                {['discord', 'telegram'].map((x) =>
                  auth[`${x}Id`] ? (
                    <MenuItem key={x} value={x}>
                      {Utility.getProperName(x)}
                    </MenuItem>
                  ) : null,
                )}
              </Select>
            </Grid>
          </Grid>
        )}
      </Grid>
      {refreshing && (
        <Notification
          severity="success"
          i18nKey="webhook_strategy_success"
          messages={[{ key: 'redirecting', variables: [] }]}
        />
      )}
    </>
  )
}

const ExtraFields = () => {
  const auth = useStatic((s) => s.auth)
  const extraUserFields = useStatic((state) => state.extraUserFields)

  const [setField] = useMutation(Query.user('setExtraFields'))

  return (
    <Grid
      container
      alignItems="center"
      justifyContent="center"
      style={{ marginBottom: 10 }}
    >
      {extraUserFields.map((field) => {
        const locale = localStorage.getItem('i18nextLng') || 'en'
        const label =
          typeof field === 'string' ? field : field[locale] || field.name
        const key = typeof field === 'string' ? field : field.database
        if (!key || !label) return null
        return (
          <Grid
            key={label}
            item
            xs={5}
            align="center"
            style={{ margin: '10px 0' }}
          >
            <TextField
              disabled={field.disabled}
              variant="outlined"
              label={label}
              value={auth.data?.[key] || ''}
              onChange={({ target: { value } }) => {
                useStatic.setState((prev) => ({
                  auth: {
                    ...prev.auth,
                    data: {
                      ...prev.auth.data,
                      [key]: value,
                    },
                  },
                }))
                setField({
                  variables: {
                    key,
                    value,
                  },
                })
              }}
            />
          </Grid>
        )
      })}
    </Grid>
  )
}

const GymBadges = () => {
  const { t } = useTranslation()
  /** @type {import('@apollo/client').QueryResult<{ badges: import('@rm/types').Gym[] }>} */
  const { data } = useQuery(Query.gyms('badges'), {
    fetchPolicy: 'network-only',
  })

  const counts = React.useMemo(() => {
    const counter = { gold: 0, silver: 0, bronze: 0 }

    if (data?.badges) {
      data.badges.forEach((gym) => {
        switch (gym.badge) {
          case 3:
            counter.gold += 1
            break
          case 2:
            counter.silver += 1
            break
          case 1:
            counter.bronze += 1
            break
          default:
        }
      })
    }
    return counter
  }, [data])

  return data ? (
    <Box className="user-profile-badge-grid">
      <Typography variant="h5" align="center" gutterBottom>
        {t('gym_badges')}
      </Typography>
      <Grid container pt={1} pb={2}>
        {Object.entries(counts).map(([key, count], i) => (
          <Grid key={key} item xs={4}>
            <Typography
              variant="subtitle2"
              align="center"
              className={`badge_${i + 1}`}
            >
              {t(`badge_${i + 1}`)}: {count}
            </Typography>
          </Grid>
        ))}
      </Grid>
      <VirtualGrid data={data?.badges || []} xs={4} md={3} useWindowScroll>
        {(_, badge) => <BadgeTile {...badge} />}
      </VirtualGrid>
    </Box>
  ) : null
}

/** @param {import('@rm/types').Gym} props */
const BadgeTile = ({ badge, ...gym }) => {
  const { t } = useTranslation()
  const map = useMap()
  const badgeIcon = useStatic((s) => s.Icons.getMisc(`badge_${badge}`))

  return badge ? (
    <Box className="vgrid-item">
      <IconButton
        className="vgrid-icon"
        disabled={gym.deleted}
        size="small"
        onClick={() =>
          useLayoutStore.setState({
            gymBadge: { badge, gymId: gym.id, open: true },
          })
        }
      >
        <Edit />
      </IconButton>
      <Button
        className="vgrid-image"
        onClick={() => map.flyTo([gym.lat, gym.lon], 16)}
        disabled={gym.deleted}
      >
        <Img
          className="badge-diamond"
          src={gym.url ? gym.url.replace('http://', 'https://') : ''}
          alt={gym.url}
          height={120}
          width={120}
        />
        {gym.deleted && <div className="disabled-overlay badge-diamond" />}
        {badge && <Img src={badgeIcon} alt={badge} width={96} zIndex={10} />}
      </Button>

      <Typography
        className="vgrid-caption"
        variant="caption"
        color={gym.deleted ? 'GrayText' : 'inherit'}
      >
        {gym.name || t('unknown_gym')}
      </Typography>
    </Box>
  ) : null
}

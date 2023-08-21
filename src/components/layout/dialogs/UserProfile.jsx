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
  Card,
  CardMedia,
  CardContent,
  IconButton,
  Dialog,
  TextField,
  Button,
  ButtonGroup,
  Divider,
  Box,
} from '@mui/material'
import Edit from '@mui/icons-material/Edit'
import { useTranslation } from 'react-i18next'
import { useLazyQuery, useMutation, useQuery } from '@apollo/client'
import { useMap } from 'react-leaflet'

import { useLayoutStore, useStatic, useStore } from '@hooks/useStore'
import Utility from '@services/Utility'
import Query from '@services/Query'

import BadgeSelection from './BadgeSelection'
import Header from '../general/Header'
import Footer from '../general/Footer'
import TabPanel from '../general/TabPanel'
import DiscordLogin from '../auth/Discord'
import Telegram from '../auth/Telegram'
import Notification from '../general/Notification'
import ReactWindow from '../general/ReactWindow'
import { DialogWrapper } from './DialogWrapper'

export default function UserProfile() {
  Utility.analytics('/user-profile')
  const { t } = useTranslation()
  const auth = useStatic((state) => state.auth)
  const {
    map: { rolesLinkName, rolesLink },
  } = useStatic((state) => state.config)

  const locale = localStorage.getItem('i18nextLng') || 'en'

  const [tab, setTab] = React.useState(0)
  const [tabsHeight, setTabsHeight] = React.useState(0)
  const [contentHeight, setContentHeight] = React.useState(0)
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
      <DialogContent
        style={{ padding: 0 }}
        ref={(ref) => ref && setContentHeight(ref.clientHeight)}
      >
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
          maxHeight={`${contentHeight - tabsHeight}px`}
          minHeight="70vh"
        >
          <TabPanel value={tab} index={0}>
            <LinkProfiles />
            <ExtraFields />
            {auth.perms.backups && <Backups />}
          </TabPanel>
          <TabPanel value={tab} index={1}>
            <GymBadges />
          </TabPanel>
          <TabPanel value={tab} index={2}>
            <ProfilePermissions />
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
  const {
    map: { discordAuthUrl, telegramAuthUrl, telegramBotName },
  } = useStatic((state) => state.config)

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

const ProfilePermissions = () => {
  const auth = useStatic((s) => s.auth)
  const excludeList = useStatic((state) => state.config?.map?.excludeList || [])

  return (
    <Grid
      container
      direction="row"
      alignItems="stretch"
      justifyContent="center"
      spacing={2}
      style={{ padding: 5 }}
    >
      {Object.keys(auth.perms).map((perm) => {
        if (excludeList.includes(perm) || perm === 'donor') {
          return null
        }
        if (Array.isArray(auth.perms[perm]) && auth.counts[perm] === 0) {
          return null
        }
        if (
          perm === 'areaRestrictions' &&
          !auth.perms[perm].length &&
          auth.counts[perm] > 0
        )
          return null
        return (
          <Grid item xs={12} sm={6} key={perm}>
            <PermCard perm={perm} />
          </Grid>
        )
      })}
    </Grid>
  )
}

const PermCard = ({ perm }) => {
  const { t } = useTranslation()
  const { permImageDir, permArrayImages } = useStatic(
    (state) => state.config.map,
  )
  const value = useStatic((s) => s.auth.perms[perm])

  return (
    <Card className="perm-wrapper">
      {(Array.isArray(value) ? false : !value) && (
        <div className="disabled-overlay flex-center">
          <Typography variant="h6" align="center" pb={4}>
            {t('no_access')}
          </Typography>
        </div>
      )}
      {(perm !== 'areaRestrictions' &&
        perm !== 'webhooks' &&
        perm !== 'scanner') ||
      permArrayImages ? (
        <CardMedia
          style={{
            height: 250,
            border: 'black 4px solid',
            borderRadius: 4,
          }}
          image={`/${permImageDir}/${perm}.png`}
          title={perm}
        />
      ) : (
        <Grid
          container
          direction="column"
          sx={{
            minHeight: 260,
            border: 'black 4px solid',
            borderRadius: 4,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            textAlign: 'center',
          }}
          alignItems="center"
          justifyContent="center"
        >
          {value.map((area) => (
            <Grid key={area} item>
              <Typography>{Utility.getProperName(area)}</Typography>
            </Grid>
          ))}
        </Grid>
      )}
      <CardContent style={{ minHeight: 100 }}>
        <Typography gutterBottom variant="h6" noWrap>
          {t(Utility.camelToSnake(perm))}
        </Typography>
        <Typography variant="body2" color="textSecondary" component="p">
          {t(`${Utility.camelToSnake(perm)}_subtitle`)}
        </Typography>
      </CardContent>
    </Card>
  )
}

const GymBadges = () => {
  const { t } = useTranslation()
  const isMobile = useStatic((s) => s.isMobile)
  const { data } = useQuery(Query.gyms('badges'), {
    fetchPolicy: 'network-only',
  })
  const Icons = useStatic((s) => s.Icons)
  const map = useMap()

  let gold = 0
  let silver = 0
  let bronze = 0

  if (data?.badges) {
    data.badges.forEach((gym) => {
      switch (gym.badge) {
        case 3:
          gold += 1
          break
        case 2:
          silver += 1
          break
        case 1:
          bronze += 1
          break
        default:
      }
    })
  }

  return data ? (
    <Grid
      container
      direction="column"
      alignItems="center"
      justifyContent="center"
      height="100cqh"
    >
      <Grid item>
        <Typography variant="h5" align="center" gutterBottom>
          {t('gym_badges')}
        </Typography>
      </Grid>
      <Grid item container direction="row">
        {[bronze, silver, gold].map((count, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <Grid key={i} item xs={4}>
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
      <Grid item style={{ flexGrow: 1, marginTop: 10, width: '100%' }}>
        <ReactWindow
          columnCount={isMobile ? 2 : 3}
          length={data.badges.length}
          data={{ badges: data.badges, Icons, t, map }}
          offset={0}
          Tile={BadgeTile}
        />
      </Grid>
    </Grid>
  ) : null
}

const BadgeTile = ({ data, rowIndex, columnIndex, style }) => {
  const { badges, columnCount, Icons, t, map } = data
  const item = badges[rowIndex * columnCount + columnIndex]
  const [badge, setBadge] = React.useState(item?.badge)
  const [badgeMenu, setBadgeMenu] = React.useState(false)

  return item && badge ? (
    <Grid
      container
      style={{
        ...style,
        backgroundColor: Utility.getTileBackground(columnIndex, rowIndex),
        textAlign: 'center',
      }}
      alignItems="center"
      justifyContent="center"
    >
      {item.deleted && <div className="disabled-overlay" />}
      <IconButton
        disabled={item.deleted}
        size="small"
        style={{ position: 'absolute', top: 2, right: 2 }}
        onClick={() => setBadgeMenu(true)}
      >
        <Edit />
      </IconButton>
      <Grid
        item
        xs={12}
        style={{ maxHeight: 60 }}
        onClick={() => map.flyTo([item.lat, item.lon], 16)}
      >
        <img
          src={item.url ? item.url.replace('http://', 'https://') : ''}
          alt={item.url}
          style={{
            width: 48,
            height: 48,
            clipPath: 'polygon(50% 0%, 80% 50%, 50% 100%, 20% 50%)',
            transform: 'translateX(50%) translateY(20%)',
          }}
        />
        {badge && (
          <img
            src={Icons.getMisc(`badge_${badge}`)}
            alt={badge}
            style={{
              width: 40,
              height: 'auto',
              bottom: -1,
              left: `${100}%`,
              transform: 'translateX(-50%) translateY(20%)',
            }}
          />
        )}
      </Grid>
      <Grid item xs={12} style={{ textAlign: 'center' }}>
        <Typography variant="caption">
          {item.name || t('unknown_gym')}
        </Typography>
      </Grid>
      <Dialog open={badgeMenu} onClose={() => setBadgeMenu(false)}>
        <BadgeSelection
          gym={item}
          badge={badge}
          setBadge={setBadge}
          setBadgeMenu={setBadgeMenu}
        />
      </Dialog>
    </Grid>
  ) : null
}

const Backups = () => {
  const { t } = useTranslation()
  const auth = useStatic((s) => s.auth)
  const { data, loading: allLoading } = useQuery(Query.user('getBackups'), {
    fetchPolicy: 'no-cache',
  })
  const [create, { loading: createLoading }] = useMutation(
    Query.user('createBackup'),
    {
      refetchQueries: ['GetBackups'],
    },
  )
  const [update, { loading: updateLoading }] = useMutation(
    Query.user('updateBackup'),
    {
      refetchQueries: ['GetBackups'],
    },
  )
  const [remove, { loading: removeLoading }] = useMutation(
    Query.user('deleteBackup'),
    {
      refetchQueries: ['GetBackups'],
    },
  )
  const [load, { data: fullBackup, loading: fullLoading }] = useLazyQuery(
    Query.user('getFullBackup'),
  )
  const [disabled, setDisabled] = React.useState(false)
  const [name, setName] = React.useState('')
  const [existing, setExisting] = React.useState({})

  React.useEffect(() => {
    if (fullBackup?.backup?.data) {
      try {
        setDisabled(true)
        localStorage.clear()
        localStorage.setItem(
          'local-state',
          JSON.stringify({
            state:
              typeof fullBackup.backup.data === 'string'
                ? JSON.parse(fullBackup.backup.data)
                : fullBackup.backup.data,
          }),
        )
        localStorage.setItem('last-loaded', fullBackup.backup.name)
        setTimeout(() => window.location.reload(), 1500)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e)
        setDisabled(false)
      }
    }
  }, [fullBackup])

  React.useEffect(() => {
    if (data?.backups) {
      setExisting(Object.fromEntries(data.backups.map((b) => [b.id, b.name])))
    }
  }, [data])

  const loading =
    allLoading ||
    createLoading ||
    updateLoading ||
    removeLoading ||
    fullLoading ||
    disabled

  return data ? (
    <Grid container alignItems="center" justifyContent="center">
      <Grid item xs={12}>
        <Typography
          variant="h5"
          align="center"
          gutterBottom
          style={{ margin: '20px 0' }}
        >
          {t('profile_backups')}
        </Typography>
      </Grid>
      <Grid item xs={5} sm={4}>
        <TextField
          label={t('new_backup')}
          fullWidth
          size="small"
          value={name || ''}
          onChange={(e) => setName(e.target.value)}
          variant="outlined"
        />
      </Grid>
      <Grid item xs={7} sm={6} style={{ textAlign: 'center' }}>
        <Button
          size="small"
          disabled={
            data.backups.length >= auth.userBackupLimits ||
            data.backups.some((x) => x.name === name) ||
            loading
          }
          variant="contained"
          color="primary"
          onClick={() => {
            create({
              variables: { backup: { name, data: useStore.getState() } },
            })
            setName('')
          }}
        >
          {t('create')}
        </Button>
      </Grid>

      {data.backups.map((backup) => (
        <Grid
          key={backup.name}
          container
          item
          xs={12}
          alignItems="center"
          justifyContent="center"
          style={{ marginTop: 12 }}
        >
          <Divider
            flexItem
            style={{ width: '90%', height: 1, margin: '10px 0' }}
          />
          <Grid item xs={5} sm={4}>
            <TextField
              label={`${t('name')}${
                localStorage.getItem('last-loaded') === backup.name ? '*' : ''
              }`}
              fullWidth
              size="small"
              value={existing[backup.id] || ''}
              onChange={(e) =>
                setExisting({ ...existing, [backup.id]: e.target.value })
              }
              variant="outlined"
            />
          </Grid>
          <Grid item xs={7} sm={6} style={{ textAlign: 'center' }}>
            <ButtonGroup variant="contained" size="small">
              <Button
                disabled={loading}
                color="secondary"
                sx={{ color: 'white' }}
                onClick={() => {
                  load({ variables: { id: backup.id } })
                }}
              >
                {t('load')}
              </Button>
              <Button
                disabled={loading}
                color="secondary"
                sx={{ color: 'white' }}
                onClick={() => {
                  update({
                    variables: {
                      backup: {
                        id: backup.id,
                        name: existing[backup.id],
                        data: useStore.getState(),
                      },
                    },
                  })
                }}
              >
                {t('update')}
              </Button>
              <Button
                disabled={loading}
                color="primary"
                sx={{ color: 'white' }}
                onClick={() => {
                  remove({ variables: { id: backup.id } })
                }}
              >
                {t('delete')}
              </Button>
            </ButtonGroup>
          </Grid>
        </Grid>
      ))}
      <Divider flexItem style={{ width: '90%', height: 1, margin: '10px 0' }} />
    </Grid>
  ) : null
}

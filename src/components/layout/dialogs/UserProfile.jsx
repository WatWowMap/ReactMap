import React, { useState } from 'react'
import {
  Grid,
  Typography,
  DialogContent,
  List,
  ListItem,
  AppBar,
  Tabs,
  Tab,
  Select,
  MenuItem,
} from '@material-ui/core'
import Card from '@material-ui/core/Card'
import CardContent from '@material-ui/core/CardContent'
import CardMedia from '@material-ui/core/CardMedia'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@apollo/client'

import { useStatic } from '@hooks/useStore'
import Utility from '@services/Utility'
import Query from '@services/Query'

import Header from '../general/Header'
import Footer from '../general/Footer'
import TabPanel from '../general/TabPanel'
import DiscordLogin from '../auth/Discord'
import Telegram from '../auth/Telegram'
import Notification from '../general/Notification'

export default function UserProfile({ setUserProfile }) {
  Utility.analytics('/user-profile')
  const { t } = useTranslation()
  const auth = useStatic(state => state.auth)
  const { map: { excludeList, rolesLinkName, rolesLink } } = useStatic(state => state.config)

  const PermPage = (
    <ProfilePermissions
      perms={auth.perms}
      excludeList={excludeList}
      t={t}
    />
  )

  return (
    <>
      <Header titles={['user_profile']} action={() => setUserProfile(false)} />
      <DialogContent style={{ padding: 0 }}>
        {auth.strategy === 'local' ? (
          <LinkProfiles auth={auth} PermPage={PermPage} t={t} />
        ) : PermPage}
      </DialogContent>
      <Footer options={[
        { name: rolesLinkName, link: rolesLink, color: 'primary' },
        { name: 'close', color: 'secondary', action: () => setUserProfile(false) },
      ]}
      />
    </>
  )
}

const LinkProfiles = ({ auth, t, PermPage }) => {
  const setAuth = useStatic(state => state.setAuth)
  const { map: { discordAuthUrl, telegramAuthUrl, telegramBotEnvRef } } = useStatic(state => state.config)

  const [tab, setTab] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const [setWebhookStrategy] = useMutation(Query.user('setWebhookStrategy'))

  const handleTabChange = (event, newValue) => {
    setTab(newValue)
  }

  if (refreshing) {
    setTimeout(() => window.location.reload(), 2000)
  }

  return (
    <>
      <AppBar position="static">
        <Tabs
          value={tab}
          onChange={handleTabChange}
          indicatorColor="secondary"
          variant="fullWidth"
          style={{ backgroundColor: '#424242', width: '100%' }}
        >
          {['profile', 'access'].map(each => (
            <Tab
              key={each}
              label={t(each)}
              style={{ width: 40, minWidth: 40 }}
            />
          ))}
        </Tabs>
      </AppBar>
      <TabPanel value={tab} index={0}>
        <Grid
          container
          direction="column"
          alignItems="center"
          justifyContent="center"
          style={{ minHeight: '65vh' }}
        >
          {auth.methods.some(method => method.includes('discord')) && (
            <Grid item style={{ padding: '20px 0' }}>
              {auth.discordId
                ? <Typography color="secondary">{t('discord_linked')}</Typography>
                : <DiscordLogin href={discordAuthUrl} text="link_discord" size="medium" />}
            </Grid>
          )}
          {auth.methods.some(method => method.includes('telegram')) && (
            <Grid item style={{ padding: '20px 0' }}>
              {auth.telegramId
                ? <Typography color="secondary">{t('telegram_linked')}</Typography>
                : <Telegram authUrl={telegramAuthUrl} botName={telegramBotEnvRef} />}
            </Grid>
          )}
          <Grid container item alignItems="center" justifyContent="center">
            <Grid item xs={12} sm={6} md={5} style={{ textAlign: 'center', padding: '20px 0' }}>
              <Typography>
                {t('select_webhook_strategy')}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4} style={{ textAlign: 'center' }}>
              <Select
                value={auth.webhookStrategy}
                onChange={(e) => {
                  setWebhookStrategy({
                    variables: {
                      strategy: e.target.value,
                    },
                  })
                  setAuth({ ...auth, webhookStrategy: e.target.value })
                  setRefreshing(true)
                }}
                style={{ minWidth: 100 }}
              >
                {['discord', 'telegram'].map((x) => (
                  auth[`${x}Id`] ? (
                    <MenuItem key={x} value={x}>
                      {Utility.getProperName(x)}
                    </MenuItem>
                  ) : null
                ))}
              </Select>
            </Grid>
          </Grid>
        </Grid>
      </TabPanel>
      <TabPanel value={tab} index={1}>
        {PermPage}
      </TabPanel>
      {refreshing && <Notification severity="success" i18nKey="webhook_strategy_success" messages={[{ key: 'redirecting', variables: [] }]} />}
    </>
  )
}

const ProfilePermissions = ({ perms, excludeList, t }) => (
  <Grid
    container
    direction="row"
    alignItems="center"
    justifyContent="center"
    spacing={2}
    style={{ padding: 5 }}
  >
    {Object.keys(perms).map(perm => {
      if (excludeList.includes(perm) || perm === 'donor') {
        return null
      }
      return (
        <Grid item xs={12} sm={6} key={perm}>
          <Card className="perm-wrapper">
            {!perms[perm] && <div className="disabled-overlay" />}
            {perm !== 'areaRestrictions' && perm !== 'webhooks' ? (
              <CardMedia
                style={{
                  height: 250,
                  border: 'black 4px solid',
                  borderRadius: 4,
                }}
                image={`/images/perms/${perm}.png`}
                title={perm}
              />
            ) : (
              <List
                style={{
                  height: 235,
                  border: 'black 4px solid',
                  borderRadius: 4,
                }}
              >
                {perms[perm].map(area => (
                  <ListItem key={area}>
                    <Typography>
                      {Utility.getProperName(area)}
                    </Typography>
                  </ListItem>
                ))}
              </List>
            )}
            <CardContent style={{ height: 100 }}>
              <Typography gutterBottom variant="h6" noWrap>
                {t(Utility.camelToSnake(perm))}
              </Typography>
              <Typography variant="body2" color="textSecondary" component="p">
                {t(`${Utility.camelToSnake(perm)}_subtitle`)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      )
    })}
  </Grid>
)

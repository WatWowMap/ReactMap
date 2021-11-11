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
} from '@material-ui/core'
import Card from '@material-ui/core/Card'
import CardContent from '@material-ui/core/CardContent'
import CardMedia from '@material-ui/core/CardMedia'
import { useTranslation } from 'react-i18next'

import { useStatic } from '@hooks/useStore'
import Utility from '@services/Utility'
import Header from '../general/Header'
import Footer from '../general/Footer'

import TabPanel from '../general/TabPanel'

export default function UserProfile({ setUserProfile }) {
  Utility.analytics('/user-profile')
  const { t } = useTranslation()
  const { perms, methods } = useStatic(state => state.auth)
  const { map: { excludeList, rolesLinkName, rolesLink } } = useStatic(state => state.config)
  const [tab, setTab] = useState(0)

  const handleTabChange = (event, newValue) => {
    setTab(newValue)
  }

  return (
    <>
      <Header titles={['userProfile']} action={() => setUserProfile(false)} />
      <DialogContent style={{ padding: 0 }}>
        <AppBar position="static">
          <Tabs
            value={tab}
            onChange={handleTabChange}
            indicatorColor="secondary"
            variant="fullWidth"
            style={{ backgroundColor: '#424242', width: '100%' }}
          >
            {['primary', 'popup'].map(each => (
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
            spacing={2}
          >
            {methods.includes('discord') && (
              <Grid item>
                Link Discord
              </Grid>
            )}
            {methods.includes('telegram') && (
              <Grid item>
                Link Telegram
              </Grid>
            )}
          </Grid>
        </TabPanel>
        <TabPanel value={tab} index={1}>
          <Grid
            container
            direction="row"
            alignItems="center"
            justifyContent="center"
            spacing={2}
          >
            {Object.keys(perms).map(perm => {
              if (excludeList.includes(perm)) {
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
                        {t(perm)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" component="p">
                        {t(`${perm}Subtitle`)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}
          </Grid>
        </TabPanel>
      </DialogContent>
      <Footer options={[
        { name: rolesLinkName, link: rolesLink, color: 'primary' },
        { name: 'close', color: 'secondary', action: () => setUserProfile(false) },
      ]}
      />
    </>
  )
}

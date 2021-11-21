import React from 'react'
import {
  Grid,
  Typography,
  DialogContent,
  List,
  ListItem,
} from '@material-ui/core'
import Card from '@material-ui/core/Card'
import CardContent from '@material-ui/core/CardContent'
import CardMedia from '@material-ui/core/CardMedia'
import { useTranslation } from 'react-i18next'

import { useStatic } from '@hooks/useStore'
import Utility from '@services/Utility'
import Header from '../general/Header'
import Footer from '../general/Footer'

export default function UserProfile({ setUserProfile }) {
  Utility.analytics('/user-profile')
  const { t } = useTranslation()
  const { perms } = useStatic(state => state.auth)
  const { map: { excludeList, rolesLinkName, rolesLink } } = useStatic(state => state.config)

  return (
    <>
      <Header titles={['user_profile']} action={() => setUserProfile(false)} />
      <DialogContent>
        <Grid
          container
          direction="row"
          alignItems="center"
          justifyContent="center"
          spacing={2}
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
      </DialogContent>
      <Footer options={[
        { name: rolesLinkName, link: rolesLink, color: 'primary' },
        { name: 'close', color: 'secondary', action: () => setUserProfile(false) },
      ]}
      />
    </>
  )
}

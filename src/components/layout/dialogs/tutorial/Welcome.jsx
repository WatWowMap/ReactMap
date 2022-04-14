import React from 'react'
import {
  DialogContent,
  Grid,
  Typography,
  Fab,
} from '@material-ui/core'
import { Person, LockOpen } from '@material-ui/icons'
import { useTranslation } from 'react-i18next'

import { useStatic } from '@hooks/useStore'
import LocaleSelection from '@components/layout/general/LocaleSelection'

export default function TutWelcome({ setUserProfile }) {
  const { t } = useTranslation()
  const { methods, loggedIn, perms } = useStatic(state => state.auth)
  const { map: { enableUserProfile, excludeList }, localeSelection } = useStatic(state => state.config)

  const getPerms = () => {
    let have = 0
    let total = 0
    Object.keys(perms).forEach(perm => {
      if (!excludeList.includes(perm)) {
        have += perms[perm] ? 1 : 0
        total += 1
      }
    })
    return `${have} / ${total}`
  }

  return (
    <DialogContent>
      <Grid
        container
        direction="row"
        alignItems="center"
        justifyContent="center"
        spacing={2}
        style={{ height: '100%' }}
      >
        <Grid item xs={12}>
          <Typography variant="h4" align="center" style={{ margin: 10 }}>
            {t('welcome')} {document.title}!
          </Typography>
        </Grid>

        <Grid item xs={6}>
          <Typography variant="subtitle2" align="center">
            {t('tutorial_categories')}:
          </Typography>
        </Grid>
        {enableUserProfile && (
          <Grid item xs={6}>
            <Typography variant="h6" gutterBottom align="center">
              {!loggedIn && methods.length ? t('login_optional') : t('view_profile')}
            </Typography>
          </Grid>
        )}
        <Grid item xs={6}>
          <Typography variant="h3" align="center">
            {getPerms()}
          </Typography>
        </Grid>
        <Grid item xs={6} style={{ textAlign: 'center' }}>
          {(() => {
            if (!loggedIn && methods.length) {
              return (
                <Fab color="primary" href="/login">
                  <LockOpen />
                </Fab>
              )
            }
            return enableUserProfile ? (
              <Fab color="primary" onClick={() => setUserProfile(true)}>
                <Person />
              </Fab>
            ) : null
          })()}
        </Grid>
        {enableUserProfile && (
          <Grid item xs={12} sm={10} style={{ marginTop: 10 }}>
            <Typography variant="subtitle1" align="center">
              {!loggedIn && methods.length ? t('tutorial_logged_out') : t('tutorial_logged_in')}
            </Typography>
          </Grid>
        )}
        <Grid item xs={12} sm={10} style={{ marginTop: 10 }}>
          <Typography variant="subtitle1" align="center">
            {t('tutorial_language')}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={10} style={{ textAlign: 'center' }}>
          <LocaleSelection localeSelection={localeSelection} />
        </Grid>
        <Grid item xs={12} sm={10} style={{ marginTop: 10 }}>
          <Typography variant="subtitle1" align="center">
            {t('tutorial_welcome')}
          </Typography>
        </Grid>
      </Grid>
    </DialogContent>
  )
}

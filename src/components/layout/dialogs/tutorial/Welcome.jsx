import React from 'react'
import Person from '@mui/icons-material/Person'
import LockOpen from '@mui/icons-material/LockOpen'
import { DialogContent, Grid, Typography, Fab } from '@mui/material'

import { useTranslation } from 'react-i18next'

import { useStatic } from '@hooks/useStore'
import LocaleSelection from '@components/layout/general/LocaleSelection'

export default function TutWelcome({ setUserProfile }) {
  const { t } = useTranslation()
  const { methods, loggedIn, perms, counts } = useStatic((state) => state.auth)
  const {
    map: { enableUserProfile, excludeList },
    localeSelection,
  } = useStatic((state) => state.config)

  const getPerms = () => {
    let have = 0
    let total = 0

    Object.entries(perms).forEach(([perm, value]) => {
      if (
        (perm === 'areaRestrictions' && !value.length && counts[perm] > 0) ||
        perm === 'donor'
      )
        return
      if (!excludeList.includes(perm)) {
        have += (Array.isArray(value) ? value.length && counts[perm] : value)
          ? 1
          : 0
        if (counts[perm] !== 0) {
          total += 1
        }
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
        justifyContent="space-evenly"
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
              {!loggedIn && methods.length
                ? t('login_optional')
                : t('view_profile')}
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
              {!loggedIn && methods.length
                ? t('tutorial_logged_out')
                : t('tutorial_logged_in')}
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

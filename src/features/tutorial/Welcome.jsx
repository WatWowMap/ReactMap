import React from 'react'
import Person from '@mui/icons-material/Person'
import LockOpen from '@mui/icons-material/LockOpen'
import Grid from '@mui/material/Unstable_Grid2'
import Fab from '@mui/material/Fab'
import Typography from '@mui/material/Typography'
import DialogContent from '@mui/material/DialogContent'
import { useTranslation } from 'react-i18next'

import { useMemory } from '@store/useMemory'
import { useLayoutStore } from '@store/useLayoutStore'
import { LocaleSelection } from '@components/inputs/LocaleSelection'

export function TutorialWelcome() {
  const { t } = useTranslation()
  const { methods, loggedIn } = useMemory((s) => s.auth)
  const permStatus = useMemory((s) => {
    let have = 0
    let total = 0
    Object.entries(s.auth.perms).forEach(([perm, value]) => {
      if (
        (perm === 'areaRestrictions' &&
          !value.length &&
          s.auth.counts[perm] > 0) ||
        perm === 'donor' ||
        perm === 'admin' ||
        perm === 'blockedGuildNames'
      )
        return
      if (!s.auth.excludeList.includes(perm)) {
        have += (
          Array.isArray(value) ? value.length && s.auth.counts[perm] : value
        )
          ? 1
          : 0
        if (s.auth.counts[perm] !== 0) {
          total += 1
        }
      }
    })
    return `${have} / ${total}`
  })
  const enableUserProfile = useMemory((s) => s.config.misc.enableUserProfile)

  return (
    <DialogContent>
      <Grid
        container
        direction="row"
        alignItems="center"
        justifyContent="space-evenly"
        spacing={2}
        height="100%"
      >
        <Grid xs={12}>
          <Typography variant="h4" align="center" margin={2}>
            {t('welcome')} {document.title}!
          </Typography>
        </Grid>

        <Grid xs={6}>
          <Typography variant="subtitle2" align="center">
            {t('tutorial_categories')}:
          </Typography>
        </Grid>
        {enableUserProfile && (
          <Grid xs={6}>
            <Typography variant="h6" gutterBottom align="center">
              {!loggedIn && methods.length
                ? t('login_optional')
                : t('view_profile')}
            </Typography>
          </Grid>
        )}
        <Grid xs={6}>
          <Typography variant="h3" align="center">
            {permStatus}
          </Typography>
        </Grid>
        <Grid xs={6} textAlign="center">
          {(() => {
            if (!loggedIn && methods.length) {
              return (
                <Fab color="primary" href="/login">
                  <LockOpen />
                </Fab>
              )
            }
            return enableUserProfile ? (
              <Fab
                color="primary"
                onClick={() => useLayoutStore.setState({ userProfile: true })}
              >
                <Person />
              </Fab>
            ) : null
          })()}
        </Grid>
        {enableUserProfile && (
          <Grid xs={12} sm={10} marginTop={2}>
            <Typography variant="subtitle1" align="center">
              {!loggedIn && methods.length
                ? t('tutorial_logged_out')
                : t('tutorial_logged_in')}
            </Typography>
          </Grid>
        )}
        <Grid xs={12} sm={10} marginTop={2}>
          <Typography variant="subtitle1" align="center">
            {t('tutorial_language')}
          </Typography>
        </Grid>
        <Grid xs={12} sm={10} textAlign="center">
          <LocaleSelection />
        </Grid>
        <Grid xs={12} sm={10} marginTop={2}>
          <Typography variant="subtitle1" align="center">
            {t('tutorial_welcome')}
          </Typography>
        </Grid>
      </Grid>
    </DialogContent>
  )
}

import React from 'react'
import {
  DialogContent,
  Grid,
  Typography,
  Fab,
  Icon,
} from '@material-ui/core'
import { Person } from '@material-ui/icons'
import { useTranslation } from 'react-i18next'

import { useStatic } from '@hooks/useStore'

export default function TutWelcome({ setUserProfile }) {
  const { t } = useTranslation()
  const { loggedIn, perms } = useStatic(state => state.auth)
  const { map: { excludeList } } = useStatic(state => state.config)

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
    <DialogContent style={{ marginTop: 5 }}>
      <Grid
        container
        direction="row"
        alignItems="center"
        justify="center"
        spacing={2}
      >
        <Grid item xs={6}>
          <Typography variant="subtitle2" align="center">
            {t('tutorialCategories')}:
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="h6" gutterBottom align="center">
            {loggedIn ? t('viewProfile') : t('loginOptional')}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="h3" align="center">
            {getPerms()}
          </Typography>
        </Grid>
        <Grid item xs={6} style={{ textAlign: 'center' }}>
          {loggedIn ? (
            <Fab color="primary" onClick={() => setUserProfile(true)}>
              <Person />
            </Fab>
          ) : (
            <Fab
              style={{ backgroundColor: 'rgb(114,136,218)', color: 'white' }}
              href="/auth/discord"
            >
              <Icon className="fab fa-discord" />
            </Fab>
          )}
        </Grid>
        <Grid item xs={12} sm={10} style={{ marginTop: 10 }}>
          <Typography variant="subtitle1" align="center">
            {loggedIn ? t('tutorialLoggedIn') : t('tutorialLoggedOut')}
          </Typography>
        </Grid>
      </Grid>
    </DialogContent>
  )
}

import React from 'react'
import {
  DialogContent,
  Grid,
  Typography,
  Fab,
  Icon,
  Select,
  MenuItem,
} from '@material-ui/core'
import { Person } from '@material-ui/icons'
import { useTranslation } from 'react-i18next'

import { useStatic } from '@hooks/useStore'

export default function TutWelcome({ setUserProfile }) {
  const { t, i18n } = useTranslation()
  const { discord, loggedIn, perms } = useStatic(state => state.auth)
  const { map: { excludeList }, localeSelection } = useStatic(state => state.config)

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
        justify="center"
        spacing={2}
      >
        <Grid item xs={12}>
          <Typography variant="h4" align="center" style={{ margin: 10 }}>
            {t('welcome')} {document.title}!
          </Typography>
        </Grid>
        {discord
          && (
            <>
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
            </>
          )}
        <Grid item xs={12} sm={10} style={{ marginTop: 10 }}>
          <Typography variant="subtitle1" align="center">
            {t('tutorialLanguage')}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={10} style={{ textAlign: 'center' }}>
          <Select
            autoFocus
            name="localeSelection"
            value={localStorage.getItem('i18nextLng')}
            onChange={(event) => i18n.changeLanguage(event.target.value)}
            fullWidth
          >
            {Object.keys(localeSelection).map(option => (
              <MenuItem
                key={option}
                value={option}
              >
                {t(`localeSelection${option}`)}
              </MenuItem>
            ))}
          </Select>
        </Grid>
        <Grid item xs={12} sm={10} style={{ marginTop: 10 }}>
          <Typography variant="subtitle1" align="center">
            {t('tutorialWelcome')}
          </Typography>
        </Grid>
      </Grid>
    </DialogContent>
  )
}

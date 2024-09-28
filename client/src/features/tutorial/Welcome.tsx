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
          Array.isArray(value) &&
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
        alignItems="center"
        direction="row"
        height="100%"
        justifyContent="space-evenly"
        spacing={2}
      >
        <Grid xs={12}>
          <Typography align="center" margin={2} variant="h4">
            {t('welcome')} {document.title}!
          </Typography>
        </Grid>

        <Grid xs={6}>
          <Typography align="center" variant="subtitle2">
            {t('tutorial_categories')}:
          </Typography>
        </Grid>
        {enableUserProfile && (
          <Grid xs={6}>
            <Typography gutterBottom align="center" variant="h6">
              {!loggedIn && methods.length
                ? t('login_optional')
                : t('view_profile')}
            </Typography>
          </Grid>
        )}
        <Grid xs={6}>
          <Typography align="center" variant="h3">
            {permStatus}
          </Typography>
        </Grid>
        <Grid textAlign="center" xs={6}>
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
          <Grid marginTop={2} sm={10} xs={12}>
            <Typography align="center" variant="subtitle1">
              {!loggedIn && methods.length
                ? t('tutorial_logged_out')
                : t('tutorial_logged_in')}
            </Typography>
          </Grid>
        )}
        <Grid marginTop={2} sm={10} xs={12}>
          <Typography align="center" variant="subtitle1">
            {t('tutorial_language')}
          </Typography>
        </Grid>
        <Grid sm={10} textAlign="center" xs={12}>
          <LocaleSelection />
        </Grid>
        <Grid marginTop={2} sm={10} xs={12}>
          <Typography align="center" variant="subtitle1">
            {t('tutorial_welcome')}
          </Typography>
        </Grid>
      </Grid>
    </DialogContent>
  )
}

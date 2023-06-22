/* eslint-disable react/no-array-index-key */
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Grid, Typography, Button } from '@material-ui/core'

function decodeQueryParam(p) {
  return decodeURIComponent(p.replace(/\+/g, ' '))
}

export default function Blocked({ serverSettings }) {
  const { t } = useTranslation()
  const params = window.location.href.split('/').pop()

  return (
    <Grid
      container
      direction="column"
      justifyContent="center"
      alignItems="center"
      style={{ minHeight: '95vh' }}
    >
      <Grid item>
        <Typography variant="h3" style={{ color: 'white' }} align="center">
          {t('access')} {t('denied')}!
        </Typography>
      </Grid>
      <Grid item>
        <Typography variant="h6" style={{ color: 'white' }} align="center">
          {t('on_block_msg')} {decodeQueryParam(params)}.
        </Typography>
      </Grid>

      {serverSettings.config.map.discordInvite && (
        <Grid item>
          <Typography variant="h6" style={{ color: 'white' }} align="center">
            {t('on_block_join_discord')}
          </Typography>
        </Grid>
      )}

      <Grid
        container
        item
        justifyContent="center"
        alignItems="center"
        style={{ marginTop: 20, paddingTop: 20, marginBottom: 20 }}
      >
        <Grid
          item
          xs={serverSettings.config.map.discordInvite ? t('go_back') : 10}
          sm={serverSettings.config.map.discordInvite ? 3 : 10}
          style={{
            textAlign: 'center',
            marginTop: serverSettings.config.map.discordAuthUrl ? 20 : 0,
          }}
        >
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => (window.location = window.location.origin)}
          >
            {t('go_back')}
          </Button>
        </Grid>
        {serverSettings.config.map.discordInvite && (
          <Grid
            item
            xs={t('join')}
            sm={3}
            style={{ textAlign: 'center', marginTop: 20 }}
          >
            <Button
              variant="outlined"
              color="secondary"
              onClick={() =>
                (window.location = serverSettings.config.map.discordInvite)
              }
            >
              {t('join')}
            </Button>
          </Grid>
        )}
      </Grid>
    </Grid>
  )
}

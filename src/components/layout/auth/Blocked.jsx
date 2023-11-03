// @ts-check
/* eslint-disable react/no-array-index-key */
import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Grid from '@mui/material/Unstable_Grid2'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { useStatic } from '@hooks/useStore'

import DiscordLogin from './Discord'

export default function Blocked() {
  const { t } = useTranslation()
  const { info } = useParams()
  const navigate = useNavigate()
  const discordInvite = useStatic((s) => s.config?.links?.discordInvite)

  const queryParams = new URLSearchParams(info)
  const blockedGuilds = queryParams.get('blockedGuilds')

  return (
    <Grid
      container
      justifyContent="center"
      alignItems="center"
      height="100cqh"
      py={10}
    >
      <Grid xs={11}>
        <Typography variant="h3" align="center">
          {t('access')} {t('denied')}!
        </Typography>
      </Grid>

      {blockedGuilds && (
        <Grid xs={11}>
          <Typography variant="h6" align="center">
            {t('on_block_msg')} {blockedGuilds}
          </Typography>
        </Grid>
      )}

      {discordInvite && (
        <Grid xs={11}>
          <Typography variant="h6" align="center">
            {t('on_block_join_discord')}
          </Typography>
        </Grid>
      )}
      <Grid
        xs={discordInvite ? 6 : 11}
        sm={discordInvite ? 4 : 11}
        md={discordInvite ? 3 : 11}
        textAlign="center"
      >
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate('/')}
          size="large"
        >
          {t('go_back')}
        </Button>
      </Grid>
      {discordInvite && (
        <Grid xs={6} sm={4} md={3} textAlign="center">
          <DiscordLogin href={discordInvite}>join</DiscordLogin>
        </Grid>
      )}
    </Grid>
  )
}

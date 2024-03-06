// @ts-check
import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Avatar from '@mui/material/Avatar'
import Card from '@mui/material/Card'
import CardActions from '@mui/material/CardActions'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Box from '@mui/material/Box'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'

import { useMemory } from '@store/useMemory'
import { DiscordButton } from '@components/auth/Discord'
import { ThemeToggle } from '@components/inputs/ThemeToggle'
import { I } from '@components/I'

export function BlockedPage() {
  const { t } = useTranslation()
  const { info } = useParams()
  const navigate = useNavigate()
  const discordInvite = useMemory((s) => s.config?.links?.discordInvite)
  const queryParams = new URLSearchParams(info)
  const blockedGuilds = queryParams.get('blockedGuilds')
  const username = queryParams.get('username')
  const avatar = queryParams.get('avatar')
  const id = queryParams.get('id')

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      height="100cqh"
      width="100%"
    >
      <Box position="absolute" top={10} right={10}>
        <ThemeToggle />
      </Box>
      <Card elevation={10}>
        {username && avatar && id && (
          <CardHeader
            sx={{ px: 4, pt: 4 }}
            avatar={
              <Avatar
                src={`https://cdn.discordapp.com/avatars/${id}/${avatar}.webp?size=96`}
                alt={username}
              />
            }
            title={t('signed_in_as')}
            subheader={username}
          />
        )}
        <CardContent sx={{ mx: 2 }}>
          <Typography variant="h3" align="center" pb={2}>
            {t('access_denied')}!
          </Typography>
          {blockedGuilds ? (
            <>
              <Typography variant="body1" align="center">
                {t('on_block_msg')}:
              </Typography>
              <List>
                {blockedGuilds.split(',').map((guild) => (
                  <ListItem key={guild} sx={{ ml: 2 }}>
                    <ListItemIcon>
                      <I className="fab fa-discord" size="small" />
                    </ListItemIcon>
                    <ListItemText primary={guild} />
                  </ListItem>
                ))}
              </List>
            </>
          ) : (
            <Typography variant="body1" align="center">
              {t('missing_map_perm')}
            </Typography>
          )}
          {discordInvite && (
            <Typography variant="body1" align="center">
              {t('on_block_join_discord')}
            </Typography>
          )}
        </CardContent>
        <CardActions sx={{ p: 4 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/')}
            size="small"
          >
            {t('go_back')}
          </Button>
          {discordInvite && (
            <DiscordButton href={discordInvite} size="small">
              {t('join')}
            </DiscordButton>
          )}
        </CardActions>
      </Card>
    </Box>
  )
}

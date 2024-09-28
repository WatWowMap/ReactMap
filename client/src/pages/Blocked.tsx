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
  const roleLink = useMemory((s) => s.config?.links?.rolesLink)
  const roleLinkName = useMemory((s) => s.config?.links?.rolesLinkName)
  const queryParams = new URLSearchParams(info)
  const blockedGuilds = queryParams.get('blockedGuilds')
  const username = queryParams.get('username')
  const avatar = queryParams.get('avatar')
  const id = queryParams.get('id')

  return (
    <Box
      alignItems="center"
      display="flex"
      height="100cqh"
      justifyContent="center"
      width="100%"
    >
      <Box position="absolute" right={10} top={10}>
        <ThemeToggle />
      </Box>
      <Card elevation={10}>
        {username && avatar && id && (
          <CardHeader
            avatar={
              <Avatar
                alt={username}
                src={`https://cdn.discordapp.com/avatars/${id}/${avatar}.webp?size=96`}
              />
            }
            subheader={username}
            sx={{ px: 4, pt: 4 }}
            title={t('signed_in_as')}
          />
        )}
        <CardContent sx={{ mx: 2 }}>
          <Typography align="center" pb={2} variant="h3">
            {t('access_denied')}!
          </Typography>
          {blockedGuilds ? (
            <>
              <Typography align="center" variant="body1">
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
            <Typography align="center" variant="body1">
              {t('missing_map_perm')}
            </Typography>
          )}
          {discordInvite && (
            <Typography align="center" variant="body1">
              {t('on_block_join_discord')}
            </Typography>
          )}
        </CardContent>
        <CardActions sx={{ p: 4 }}>
          <Button
            color="primary"
            size="small"
            variant="contained"
            onClick={() => navigate('/')}
          >
            {t('go_back')}
          </Button>
          {roleLink && roleLinkName && (
            <Button
              color="success"
              href={roleLink}
              size="small"
              sx={{ color: 'white' }}
              target="_blank"
              variant="contained"
            >
              {roleLinkName}
            </Button>
          )}
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

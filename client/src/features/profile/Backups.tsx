import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useLazyQuery, useMutation, useQuery } from '@apollo/client'
import List from '@mui/material/List'
import ListSubheader from '@mui/material/ListSubheader'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import ButtonGroup from '@mui/material/ButtonGroup'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Box from '@mui/material/Box'
import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { Query } from '@services/queries'

export function UserBackups() {
  const { t } = useTranslation()
  const hasPerm = useMemory((s) => s.auth.perms.backups)

  const { data } = useQuery<{ backups: import('@rm/types').Backup[] }>(
    Query.user('GET_BACKUPS'),
    {
      fetchPolicy: 'no-cache',
      skip: !hasPerm,
    },
  )

  return data && hasPerm ? (
    <Box className="flex-center">
      <List>
        <ListSubheader>
          <Typography align="center" py={2} variant="h6">
            {t('profile_backups')}
          </Typography>
        </ListSubheader>
        <CreateNew backups={data.backups || []} />
        {data.backups.map((backup) => (
          <React.Fragment key={backup.name}>
            <Divider style={{ margin: '16px 0' }} />
            <BackupItem backup={backup} />
          </React.Fragment>
        ))}
      </List>
    </Box>
  ) : null
}

function CreateNew({ backups }: { backups: import('@rm/types').Backup[] }) {
  const { t } = useTranslation()
  const userBackupLimits = useMemory((s) => s.auth.userBackupLimits)
  const [name, setName] = React.useState('')

  const [create, { loading }] = useMutation(Query.user('CREATE_BACKUP'), {
    refetchQueries: ['GetBackups'],
  })

  return (
    <ListItem>
      <TextField
        fullWidth
        label={t('new_backup')}
        size="small"
        value={name || ''}
        variant="outlined"
        onChange={(e) => setName(e.target.value)}
      />
      <ListItemButton
        disabled={
          backups.length >= userBackupLimits ||
          backups.some((x) => x.name === name) ||
          loading
        }
        onClick={() => {
          create({
            variables: { backup: { name, data: useStorage.getState() } },
          })
          setName('')
        }}
      >
        {t('create')}
      </ListItemButton>
    </ListItem>
  )
}

function BackupItem({ backup }: { backup: import('@rm/types').Backup }) {
  const { t } = useTranslation()
  const [name, setName] = React.useState(backup.name)
  const [loading, setLoading] = React.useState(false)

  const [update, { loading: l1 }] = useMutation(Query.user('UPDATE_BACKUP'), {
    refetchQueries: ['GetBackups'],
  })
  const [remove, { loading: l2 }] = useMutation(Query.user('DELETE_BACKUP'), {
    refetchQueries: ['GetBackups'],
  })
  const [load, { data: fullBackup, loading: l3 }] = useLazyQuery(
    Query.user('GET_FULL_BACKUP'),
  )

  React.useEffect(() => setName(backup.name), [backup])
  React.useEffect(() => setLoading(l1 || l2 || l3), [l1, l2, l3])

  React.useEffect(() => {
    if (fullBackup?.backup?.data) {
      try {
        setLoading(true)
        localStorage.clear()
        localStorage.setItem(
          'local-state',
          JSON.stringify({
            state:
              typeof fullBackup.backup.data === 'string'
                ? JSON.parse(fullBackup.backup.data)
                : fullBackup.backup.data,
          }),
        )
        localStorage.setItem('last-loaded', fullBackup.backup.name)
        setTimeout(() => window.location.reload(), 1500)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e)
        setLoading(false)
      } finally {
        setLoading(false)
      }
    }
  }, [fullBackup])

  return (
    <ListItem>
      <TextField
        label={`${t('name')}${
          localStorage.getItem('last-loaded') === backup.name ? '*' : ''
        }`}
        size="small"
        sx={{ mr: 2 }}
        value={name || ''}
        variant="outlined"
        onChange={(e) => setName(e.target.value)}
      />
      <ButtonGroup size="small" variant="outlined">
        <Button
          color="secondary"
          disabled={loading}
          onClick={() => {
            load({ variables: { id: backup.id } })
          }}
        >
          {t('load')}
        </Button>
        <Button
          color="secondary"
          disabled={loading}
          onClick={() => {
            update({
              variables: {
                backup: {
                  id: backup.id,
                  name,
                  data: useStorage.getState(),
                },
              },
            })
          }}
        >
          {t('update')}
        </Button>
        <Button
          color="primary"
          disabled={loading}
          onClick={() => {
            remove({ variables: { id: backup.id } })
          }}
        >
          {t('delete')}
        </Button>
      </ButtonGroup>
    </ListItem>
  )
}

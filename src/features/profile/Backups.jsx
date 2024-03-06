// @ts-check
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
import { Query } from '@services/Query'

export function UserBackups() {
  const { t } = useTranslation()
  const hasPerm = useMemory((s) => s.auth.perms.backups)

  /** @type {import('@apollo/client').QueryResult<{ backups: import('@rm/types').Backup[] }>} */
  const { data } = useQuery(Query.user('getBackups'), {
    fetchPolicy: 'no-cache',
    skip: !hasPerm,
  })

  return data && hasPerm ? (
    <Box className="flex-center">
      <List>
        <ListSubheader>
          <Typography variant="h6" align="center" py={2}>
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

/** @param {{ backups: import('@rm/types').Backup[] }} props */
function CreateNew({ backups }) {
  const { t } = useTranslation()
  const userBackupLimits = useMemory((s) => s.auth.userBackupLimits)
  const [name, setName] = React.useState('')

  const [create, { loading }] = useMutation(Query.user('createBackup'), {
    refetchQueries: ['GetBackups'],
  })
  return (
    <ListItem>
      <TextField
        label={t('new_backup')}
        fullWidth
        size="small"
        value={name || ''}
        onChange={(e) => setName(e.target.value)}
        variant="outlined"
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

/** @param {{ backup: import('@rm/types').Backup }} props */
function BackupItem({ backup }) {
  const { t } = useTranslation()
  const [name, setName] = React.useState(backup.name)
  const [loading, setLoading] = React.useState(false)

  const [update, { loading: l1 }] = useMutation(Query.user('updateBackup'), {
    refetchQueries: ['GetBackups'],
  })
  const [remove, { loading: l2 }] = useMutation(Query.user('deleteBackup'), {
    refetchQueries: ['GetBackups'],
  })
  const [load, { data: fullBackup, loading: l3 }] = useLazyQuery(
    Query.user('getFullBackup'),
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
        value={name || ''}
        onChange={(e) => setName(e.target.value)}
        variant="outlined"
        sx={{ mr: 2 }}
      />
      <ButtonGroup variant="outlined" size="small">
        <Button
          disabled={loading}
          color="secondary"
          onClick={() => {
            load({ variables: { id: backup.id } })
          }}
        >
          {t('load')}
        </Button>
        <Button
          disabled={loading}
          color="secondary"
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
          disabled={loading}
          color="primary"
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

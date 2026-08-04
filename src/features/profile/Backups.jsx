// @ts-check
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import {
  useLazyQuery,
  useMutation,
  useQuery,
  ApolloError,
} from '@apollo/client'
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
import { createBackupData } from './backupData'

/** @param {unknown} err @param {(key: string) => string} t */
function getBackupErrorMessage(err, t) {
  let message = t('backup_error_generic')
  if (err instanceof ApolloError) {
    const { networkError } = err
    if (
      networkError &&
      'statusCode' in networkError &&
      networkError.statusCode === 413
    ) {
      message = t('backup_error_too_large')
    } else if (err.message) {
      message = err.message
    }
  }
  return message
}

const getCurrentBackupData = () =>
  createBackupData(useStorage.getState(), useMemory.getState().filters)

export function UserBackups() {
  const { t } = useTranslation()
  const hasPerm = useMemory((s) => s.auth.perms.backups)

  /** @type {import('@apollo/client').QueryResult<{ backups: import('@rm/types').Backup[] }>} */
  const { data } = useQuery(Query.user('GET_BACKUPS'), {
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
  const [errorMessage, setErrorMessage] = React.useState('')

  const [create, { loading }] = useMutation(Query.user('CREATE_BACKUP'), {
    refetchQueries: ['GetBackups'],
  })

  const handleCreate = React.useCallback(async () => {
    if (
      backups.length >= userBackupLimits ||
      backups.some((x) => x.name === name) ||
      loading
    )
      return
    setErrorMessage('')
    try {
      await create({
        variables: { backup: { name, data: getCurrentBackupData() } },
      })
      setName('')
    } catch (err) {
      setErrorMessage(getBackupErrorMessage(err, t))
    }
  }, [backups, create, loading, name, t, userBackupLimits])

  const handleChange = React.useCallback((event) => {
    setErrorMessage('')
    setName(event.target.value)
  }, [])

  return (
    <ListItem sx={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
        <TextField
          label={t('new_backup')}
          fullWidth
          size="small"
          value={name || ''}
          onChange={handleChange}
          variant="outlined"
        />
        <ListItemButton
          disabled={
            backups.length >= userBackupLimits ||
            backups.some((x) => x.name === name) ||
            loading
          }
          onClick={handleCreate}
        >
          {t('create')}
        </ListItemButton>
      </Box>
      {errorMessage ? (
        <Typography
          variant="caption"
          color="error"
          sx={{ mt: 1, alignSelf: 'flex-start' }}
        >
          {errorMessage}
        </Typography>
      ) : null}
    </ListItem>
  )
}

/** @param {{ backup: import('@rm/types').Backup }} props */
function BackupItem({ backup }) {
  const { t } = useTranslation()
  const [name, setName] = React.useState(backup.name)
  const [loading, setLoading] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState('')

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

  const handleUpdate = React.useCallback(async () => {
    if (loading) return
    setErrorMessage('')
    try {
      await update({
        variables: {
          backup: {
            id: backup.id,
            name,
            data: getCurrentBackupData(),
          },
        },
      })
    } catch (err) {
      setErrorMessage(getBackupErrorMessage(err, t))
    }
  }, [backup.id, loading, name, t, update])

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
    <ListItem sx={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <Box sx={{ display: 'flex', width: '100%' }}>
        <TextField
          label={`${t('name')}${
            localStorage.getItem('last-loaded') === backup.name ? '*' : ''
          }`}
          size="small"
          value={name || ''}
          onChange={(e) => {
            setErrorMessage('')
            setName(e.target.value)
          }}
          variant="outlined"
          sx={{ mr: 2 }}
        />
        <ButtonGroup variant="outlined" size="small">
          <Button
            disabled={loading}
            color="secondary"
            onClick={() => {
              setErrorMessage('')
              load({ variables: { id: backup.id } })
            }}
          >
            {t('load')}
          </Button>
          <Button disabled={loading} color="secondary" onClick={handleUpdate}>
            {t('update')}
          </Button>
          <Button
            disabled={loading}
            color="primary"
            onClick={() => {
              setErrorMessage('')
              remove({ variables: { id: backup.id } })
            }}
          >
            {t('delete')}
          </Button>
        </ButtonGroup>
      </Box>
      {errorMessage ? (
        <Typography
          variant="caption"
          color="error"
          sx={{ mt: 1, alignSelf: 'flex-start' }}
        >
          {errorMessage}
        </Typography>
      ) : null}
    </ListItem>
  )
}

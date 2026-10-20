// @ts-check
import * as React from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonGroup from '@mui/material/ButtonGroup'
import Checkbox from '@mui/material/Checkbox'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ListSubheader from '@mui/material/ListSubheader'
import TextField from '@mui/material/TextField'
import DeleteIcon from '@mui/icons-material/Delete'

import { useMemory } from '@store/useMemory'
import { Query } from '@services/queries'

/**
 * @typedef {{ playerId: string, label: string, active: boolean }} PlayerAccount
 * @typedef {PlayerAccount & { key: number }} PlayerAccountRow
 */

const FRIEND_CODE = /^\d{12}$/

let nextKey = 0

/** @param {PlayerAccount} account @returns {PlayerAccountRow} */
const toRow = ({ playerId, label, active }) => {
  nextKey += 1
  return { playerId, label, active, key: nextKey }
}

/** @param {string} playerId */
const isFriendCode = (playerId) =>
  FRIEND_CODE.test(playerId.replace(/[\s-]/g, ''))

/** The game accounts personal shinies are shown for */
export function PlayerAccounts() {
  const { t } = useTranslation()
  const allowed = useMemory(
    (s) => !!s.auth.perms.personalShiny && s.auth.loggedIn,
  )
  const max = useMemory((s) => s.auth.personalShinyMax)
  const selfService = useMemory((s) => s.auth.personalShinySelfService)

  /** @type {import('@apollo/client').QueryResult<{ playerAccounts: PlayerAccount[] }>} */
  const { data } = useQuery(Query.user('GET_PLAYER_ACCOUNTS'), {
    skip: !allowed,
  })
  const [save, { loading }] = useMutation(Query.user('SET_PLAYER_ACCOUNTS'), {
    refetchQueries: ['PlayerAccounts'],
  })

  const [rows, setRows] = React.useState(/** @type {PlayerAccountRow[]} */ ([]))
  const [dirty, setDirty] = React.useState(false)
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    if (data?.playerAccounts && !dirty) {
      setRows(data.playerAccounts.map(toRow))
    }
  }, [data, dirty])

  if (!allowed || !data || (!max && !rows.length)) return null

  /** @param {number} key @param {Partial<PlayerAccount>} change */
  const update = (key, change) => {
    setDirty(true)
    setError('')
    setRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...change } : row)),
    )
  }

  const handleSave = async () => {
    try {
      const { data: saved } = await save({
        variables: {
          accounts: rows.map(({ playerId, label, active }) => ({
            playerId,
            label,
            active,
          })),
        },
      })
      const result = saved?.setPlayerAccounts
      if (!result || result.error) {
        setError(result?.error || 'generic')
        return
      }
      setRows(result.accounts.map(toRow))
      setDirty(false)
    } catch (e) {
      setError('generic')
    }
  }

  const incomplete = rows.some(
    (row) => !row.playerId.trim() || isFriendCode(row.playerId),
  )

  return (
    <Box className="flex-center">
      <List>
        <ListSubheader>
          {t('personal_shiny')} ·{' '}
          {t('personal_shiny_count', { count: rows.length, max })}
        </ListSubheader>
        {rows.map((row) => (
          <React.Fragment key={row.key}>
            <ListItem>
              <Checkbox
                checked={row.active}
                disabled={!selfService}
                onChange={({ target }) =>
                  update(row.key, { active: target.checked })
                }
                inputProps={{ 'aria-label': t('personal_shiny_active') }}
              />
              <TextField
                size="small"
                fullWidth
                label={t('personal_shiny_label')}
                value={row.label}
                disabled={!selfService}
                inputProps={{ maxLength: 24 }}
                onChange={({ target }) =>
                  update(row.key, { label: target.value })
                }
              />
              {selfService && (
                <IconButton
                  aria-label={t('personal_shiny_remove')}
                  onClick={() => {
                    setDirty(true)
                    setError('')
                    setRows((prev) => prev.filter(({ key }) => key !== row.key))
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              )}
            </ListItem>
            <ListItem>
              <TextField
                size="small"
                fullWidth
                label={t('personal_shiny_player_id')}
                value={row.playerId}
                disabled={!selfService}
                error={isFriendCode(row.playerId)}
                helperText={
                  isFriendCode(row.playerId)
                    ? t('personal_shiny_error_friend_code')
                    : undefined
                }
                onChange={({ target }) =>
                  update(row.key, { playerId: target.value })
                }
              />
            </ListItem>
            <Divider />
          </React.Fragment>
        ))}
        {!!error && (
          <ListItem>
            <ListItemText
              secondary={t(`personal_shiny_error_${error}`, { max })}
              secondaryTypographyProps={{ color: 'error' }}
            />
          </ListItem>
        )}
        {selfService && (
          <ListItem>
            <ButtonGroup fullWidth>
              <Button
                disabled={rows.length >= max}
                onClick={() => {
                  setDirty(true)
                  setError('')
                  setRows((prev) => [
                    ...prev,
                    toRow({ playerId: '', label: '', active: true }),
                  ])
                }}
              >
                {t('personal_shiny_add')}
              </Button>
              <Button
                disabled={!dirty || loading || incomplete}
                onClick={handleSave}
              >
                {t('save')}
              </Button>
            </ButtonGroup>
          </ListItem>
        )}
      </List>
    </Box>
  )
}

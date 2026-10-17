// @ts-check
import * as React from 'react'
import Grid2 from '@mui/material/Unstable_Grid2'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Checkbox from '@mui/material/Checkbox'
import Typography from '@mui/material/Typography'
import DeleteIcon from '@mui/icons-material/Delete'
import { useMutation } from '@apollo/client'
import { useTranslation } from 'react-i18next'

import { useMemory } from '@store/useMemory'
import { Query } from '@services/queries'
import { parseShinyPlayers as parsePlayers } from '@hooks/usePersonalShiny'

/**
 * A saved player plus `input`, what the user typed: a friend code when the
 * server looks player ids up, otherwise the player id
 * @typedef {import('@hooks/usePersonalShiny').ShinyPlayer & { input: string }} PlayerRow
 */

/** @param {string} value @returns {string | null} */
const friendCode = (value) => {
  const digits = value.replace(/[\s-]/g, '')
  return /^\d{12}$/.test(digits) ? digits : null
}

/** @param {string} code */
const formatFriendCode = (code) => code.replace(/(\d{4})(?=\d)/g, '$1 ')

const TEAMS = { mystic: 'Mystic', valor: 'Valor', instinct: 'Instinct' }

/**
 * "name · L80 · Mystic", the account a friend code was found to belong to
 * @param {PlayerRow['trainer']} trainer
 */
const describeTrainer = (trainer) =>
  [
    trainer?.name,
    trainer?.level ? `L${trainer.level}` : '',
    TEAMS[trainer?.team] || '',
  ]
    .filter(Boolean)
    .join(' · ')

/**
 * @param {unknown} saved
 * @param {boolean} lookup whether friend codes are looked up, else the
 *  player id is shown
 * @returns {PlayerRow[]}
 */
const toRows = (saved, lookup) =>
  parsePlayers(saved).map((player) => ({
    ...player,
    input: lookup && player.fc ? formatFriendCode(player.fc) : player.id || '',
  }))

/**
 * What is sent to the server: a friend code keeps its player id only while
 * it is unchanged; without lookups everything is a player id
 * @param {PlayerRow} row
 * @param {boolean} lookup
 */
const toPlayer = (row, lookup) => {
  const fc = lookup ? friendCode(row.input) : null
  const same = !!fc && row.fc === fc
  return {
    name: row.name,
    id: fc ? (same ? row.id : '') : row.input.trim(),
    ...(fc ? { fc } : {}),
    ...(same && row.trainer ? { trainer: row.trainer } : {}),
    ...(row.paused ? { paused: true } : {}),
  }
}

/**
 * Lets a user save one or more named players by player id, or by friend code
 * when the server looks the player id up. Pokémon that are shiny for any of
 * them are highlighted on the map.
 */
export function PersonalShinyPlayers() {
  const { t } = useTranslation()
  // players are saved on the user, so without a login there is nothing to add to
  const allowed = useMemory(
    (s) => !!s.auth.perms?.personalShiny && !!s.auth.loggedIn,
  )
  const saved = useMemory((s) => s.auth.data?.personalShiny)
  const max = useMemory((s) => s.auth.personalShinyMax || 0)
  const lookup = useMemory((s) => !!s.auth.personalShinyLookup)
  // with room for a single player its fields are always shown
  /** @param {PlayerRow[]} rows */
  const fill = (rows) =>
    max === 1 && !rows.length ? [{ name: '', id: '', input: '' }] : rows
  const [players, setPlayers] = React.useState(() =>
    fill(toRows(saved, lookup)),
  )
  const [dirty, setDirty] = React.useState(false)
  // when the change limit allows the next new player
  const [retryAt, setRetryAt] = React.useState(0)
  const [saveFailed, setSaveFailed] = React.useState(false)
  const [save, { loading }] = useMutation(Query.user('SET_PERSONAL_SHINY'))

  React.useEffect(() => {
    if (!dirty) setPlayers(fill(toRows(saved, lookup)))
  }, [saved, max, lookup])

  if (!allowed || !max) return null

  /** @param {number} index @param {Partial<PlayerRow>} change */
  const update = (index, change) => {
    setDirty(true)
    setPlayers((prev) =>
      prev.map((player, i) =>
        i === index ? { ...player, ...change } : player,
      ),
    )
  }

  /**
   * The wrong kind of code: with lookups a friend code (12 digits) is asked
   * for, though a player id saved before is kept as long as it is unchanged;
   * without lookups a friend code can't be used, a player id is longer
   * @param {PlayerRow} row
   * @returns {string}
   */
  const wrongCode = (row) => {
    if (!row.input.trim()) return ''
    if (!lookup)
      return friendCode(row.input) ? 'personal_shiny_not_friend_code' : ''
    const savedId = !!row.id && !row.fc && row.input.trim() === row.id
    return friendCode(row.input) || savedId
      ? ''
      : 'personal_shiny_need_friend_code'
  }

  const handleSave = async () => {
    let result
    try {
      const { data } = await save({
        variables: {
          players: players
            .filter((p) => p.input.trim())
            .map((p) => toPlayer(p, lookup)),
        },
      })
      result = data?.setPersonalShiny
    } catch (e) {
      setSaveFailed(true)
      return
    }
    setSaveFailed(false)
    if (result?.error === 'change_limit') {
      setRetryAt(result.retryAt)
      return
    }
    setRetryAt(0)
    const cleaned = parsePlayers(result)
    setPlayers(fill(toRows(cleaned, lookup)))
    setDirty(false)
    useMemory.setState((prev) => ({
      auth: {
        ...prev.auth,
        data: { ...prev.auth.data, personalShiny: cleaned },
      },
    }))
  }

  return (
    <Grid2 container alignItems="flex-start" justifyContent="center">
      <Grid2 xs={12} textAlign="center">
        <Typography variant="h6">✨ {t('personal_shiny')}</Typography>
        <Typography variant="caption">
          {t(
            max > 1
              ? 'personal_shiny_description'
              : 'personal_shiny_description_single',
          )}
        </Typography>
        {max > 1 && (
          <Typography variant="caption" component="div">
            {t('personal_shiny_limit', { count: players.length, max })}
          </Typography>
        )}
        {lookup && (
          <Typography variant="caption" component="div">
            {t('personal_shiny_enter_friend_code')}
          </Typography>
        )}
      </Grid2>
      {players.map((player, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <React.Fragment key={index}>
          <Grid2 xs={2} textAlign="center">
            <Checkbox
              checked={!player.paused}
              inputProps={{ 'aria-label': t('personal_shiny_active') }}
              title={t('personal_shiny_active')}
              onChange={({ target }) =>
                update(index, { paused: !target.checked })
              }
            />
          </Grid2>
          <Grid2 xs={3}>
            <TextField
              size="small"
              // narrower than its column, so it doesn't touch the id field
              sx={{ width: '95%' }}
              label={t('name')}
              value={player.name}
              inputProps={{ maxLength: 24 }}
              // the same height as the id field with its status line
              helperText=" "
              onChange={({ target }) => update(index, { name: target.value })}
            />
          </Grid2>
          <Grid2 xs={5}>
            <TextField
              size="small"
              fullWidth
              label={t(
                lookup ? 'personal_shiny_friend_code' : 'personal_shiny_id',
              )}
              value={player.input}
              inputProps={{ maxLength: 64 }}
              error={player.lookup === 'failed' || !!wrongCode(player)}
              helperText={
                wrongCode(player)
                  ? t(wrongCode(player))
                  : player.fc && !player.id && !dirty
                    ? t(
                        player.lookup
                          ? `personal_shiny_lookup_${player.lookup}`
                          : 'personal_shiny_looking_up',
                      )
                    : player.fc &&
                        player.id &&
                        friendCode(player.input) === player.fc
                      ? describeTrainer(player.trainer) || ' '
                      : ' '
              }
              onChange={({ target }) => update(index, { input: target.value })}
            />
          </Grid2>
          <Grid2 xs={2} textAlign="center">
            <IconButton
              aria-label={t('remove')}
              onClick={() => {
                setDirty(true)
                setPlayers((prev) => fill(prev.filter((_, i) => i !== index)))
              }}
            >
              <DeleteIcon />
            </IconButton>
          </Grid2>
        </React.Fragment>
      ))}
      {saveFailed && (
        <Grid2 xs={12} textAlign="center">
          <Typography variant="caption" color="error">
            {t('personal_shiny_save_failed')}
          </Typography>
        </Grid2>
      )}
      {retryAt > Date.now() && (
        <Grid2 xs={12} textAlign="center">
          <Typography variant="caption" color="error">
            {t('personal_shiny_change_limit', {
              hours: Math.ceil((retryAt - Date.now()) / 3_600_000),
            })}
          </Typography>
        </Grid2>
      )}
      {max > 1 && (
        <Grid2 xs={6} textAlign="center">
          <Button
            disabled={players.length >= max}
            onClick={() => {
              setDirty(true)
              setPlayers((prev) => [...prev, { name: '', id: '', input: '' }])
            }}
          >
            {t('personal_shiny_add')}
          </Button>
        </Grid2>
      )}
      <Grid2 xs={max > 1 ? 6 : 12} textAlign="center">
        <Button
          variant="contained"
          color="secondary"
          disabled={!dirty || loading || players.some(wrongCode)}
          onClick={handleSave}
        >
          {t('save')}
        </Button>
      </Grid2>
    </Grid2>
  )
}

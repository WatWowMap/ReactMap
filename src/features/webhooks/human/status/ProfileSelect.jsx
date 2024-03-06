// @ts-check
import * as React from 'react'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import CircularProgress from '@mui/material/CircularProgress'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'
import { useMutation, useQuery } from '@apollo/client'
import { useTranslation } from 'react-i18next'

import { allProfiles, setHuman } from '@services/queries/webhook'

import { useWebhookStore } from '@store/useWebhookStore'

/** @type {React.CSSProperties} */
const STYLE = { minWidth: 100 }

/**
 * Convenient module for selecting a profile
 * @returns
 */
export function ProfileSelect() {
  const { t } = useTranslation()

  const currentProfile = useWebhookStore((s) => s.human.current_profile_no || 0)

  /** @type {import('@apollo/client').QueryResult<{ webhook: { profile: import("@rm/types").PoracleProfile[] } }>} */
  const {
    data: profiles,
    previousData,
    loading,
  } = useQuery(allProfiles, {
    fetchPolicy: 'no-cache',
    variables: {
      category: 'profiles',
      status: 'GET',
    },
  })

  const [save] = useMutation(setHuman)

  const onChange = React.useCallback(
    (event) => {
      save({
        variables: {
          category: 'switchProfile',
          status: 'POST',
          data: +event.target.value || currentProfile,
        },
      }).then(({ data }) => {
        if (data.webhook.human) {
          useWebhookStore.setState({ human: data.webhook.human })
        }
      })
    },
    [currentProfile],
  )

  const safeProfiles = (profiles || previousData)?.webhook?.profile

  return (
    <FormControl sx={{ m: 1 }}>
      <InputLabel id="profile-select">{t('select_profile')}</InputLabel>
      <Select
        id="profile-select"
        label={t('select_profile')}
        value={safeProfiles ? currentProfile || '' : ''}
        onChange={onChange}
        style={STYLE}
        endAdornment={loading ? <CircularProgress /> : null}
      >
        {(safeProfiles || []).map((profile) => (
          <MenuItem key={profile.profile_no} value={profile.profile_no}>
            {profile.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}

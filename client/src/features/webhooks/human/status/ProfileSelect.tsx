import * as React from 'react'
import MenuItem from '@mui/material/MenuItem'
import CircularProgress from '@mui/material/CircularProgress'
import { useMutation, useQuery } from '@apollo/client'
import { useTranslation } from 'react-i18next'

import { ALL_PROFILES, SET_HUMAN } from '@services/queries/webhook'
import { useWebhookStore } from '@store/useWebhookStore'
import { FCSelect } from '@components/inputs/FCSelect'

const STYLE: React.CSSProperties = { minWidth: 100 }

/**
 * Convenient module for selecting a profile
 */
export function ProfileSelect() {
  const { t } = useTranslation()

  const currentProfile = useWebhookStore((s) => s.human.current_profile_no || 0)

  const {
    data: profiles,
    previousData,
    loading,
  } = useQuery<{ webhook: { profile: import('@rm/types').PoracleProfile[] } }>(
    ALL_PROFILES,
    {
      fetchPolicy: 'no-cache',
      variables: {
        category: 'profiles',
        status: 'GET',
      },
    },
  )

  const [save] = useMutation(SET_HUMAN)

  const onChange: import('@mui/material').SelectProps['onChange'] =
    React.useCallback(
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
    <FCSelect
      id="profile-select"
      label={t('select_profile')}
      value={safeProfiles ? currentProfile || '' : ''}
      onChange={onChange}
      style={STYLE}
      endAdornment={loading ? <CircularProgress /> : null}
      fcSx={{ m: 1, width: '90%' }}
    >
      {(safeProfiles || []).map((profile) => (
        <MenuItem key={profile.profile_no} value={profile.profile_no}>
          {profile.name}
        </MenuItem>
      ))}
    </FCSelect>
  )
}

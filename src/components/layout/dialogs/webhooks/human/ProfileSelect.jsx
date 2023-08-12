// @ts-check
import * as React from 'react'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'

import { useStore } from '@hooks/useStore'

import { useWebhookStore } from '../store'

/** @type {React.CSSProperties} */
const STYLE = { minWidth: 100 }

/**
 * Convenient module for selecting a profile
 * @param {{  onChange: import('@mui/material').SelectProps<number>['onChange'] }} props
 * @returns
 */
export function ProfileSelect({ onChange }) {
  const selectedWebhook = useStore((s) => s.selectedWebhook)
  const profiles = useWebhookStore((s) => s.data[selectedWebhook].profile)

  /** @type {number} */
  const currentProfileNo = useWebhookStore(
    (s) => s.data[selectedWebhook].human.current_profile_no,
  )
  return (
    <Select value={currentProfileNo || ''} onChange={onChange} style={STYLE}>
      {profiles.map((profile) => (
        <MenuItem key={profile.profile_no} value={profile.profile_no}>
          {profile.name}
        </MenuItem>
      ))}
    </Select>
  )
}

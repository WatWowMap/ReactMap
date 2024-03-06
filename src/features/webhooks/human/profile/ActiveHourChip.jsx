// @ts-check
import * as React from 'react'
import Clear from '@mui/icons-material/Clear'
import Chip from '@mui/material/Chip'
import { styled } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@apollo/client'

import { ALL_PROFILES, SET_PROFILE } from '@services/queries/webhook'
import { useWebhookStore } from '@store/useWebhookStore'

const StyledChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.5),
}))

StyledChip.defaultProps = /** @type {const} */ ({
  clickable: true,
  deleteIcon: <Clear />,
  size: 'small',
  color: 'secondary',
})

/** @param {import("@rm/types").PoracleActiveHours & { uid: number }} props */
export const ActiveHourChip = ({ day, hours, mins, uid, id }) => {
  const { t } = useTranslation()
  const [save] = useMutation(SET_PROFILE, {
    refetchQueries: [ALL_PROFILES],
  })

  const handleRemoveSchedule = React.useCallback(() => {
    const profile = useWebhookStore
      .getState()
      .profile.find((p) => p.uid === uid)
    if (!profile) return

    save({
      variables: {
        category: 'profiles-update',
        data: {
          ...profile,
          active_hours: profile.active_hours.filter(
            (schedule) => schedule.id !== id,
          ),
        },
        status: 'POST',
      },
    })
  }, [id, uid])

  return (
    <StyledChip
      label={`${t(`day_${day}`)} ${hours}:${String(mins).padStart(2, '0')}`}
      onDelete={handleRemoveSchedule}
    />
  )
}

import * as React from 'react'
import Clear from '@mui/icons-material/Clear'
import Save from '@mui/icons-material/Save'
import Grid from '@mui/material/Unstable_Grid2'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import IconButton from '@mui/material/IconButton'
import OutlinedInput from '@mui/material/OutlinedInput'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@apollo/client'
import { ALL_PROFILES, SET_PROFILE } from '@services/queries/webhook'
import { useWebhookStore } from '@store/useWebhookStore'

import { handleUpdate } from './handleUpdate'

export const EditView = ({
  handleViewChange,
  uid,
}: import('./ProfileTile').Props) => {
  const { t } = useTranslation()
  const [save] = useMutation(SET_PROFILE, {
    refetchQueries: [ALL_PROFILES],
  })

  const [newActiveHours, setNewActiveHours] = React.useState({
    day: 1,
    hours: '00',
    mins: '00',
  })
  const handleEdit = React.useCallback((event) => {
    const { name, value } = event.target

    if (name === 'day') {
      setNewActiveHours((prev) => ({ ...prev, day: +value }))
    } else {
      const [hours, mins] = value.split(':')

      setNewActiveHours((prev) => ({ ...prev, hours, mins }))
    }
  }, [])

  const handleAdd = React.useCallback(() => {
    const active = useWebhookStore.getState().profile.find((p) => p.uid === uid)
    const editedProfile = {
      ...active,
      active_hours: [
        ...active.active_hours,
        { ...newActiveHours, id: `${uid}_${active.active_hours.length}` },
      ],
    }

    useWebhookStore.setState({ profileLoading: uid })
    save({
      variables: {
        category: 'profiles-update',
        data: editedProfile,
        status: 'POST',
      },
    }).then(handleUpdate)
    handleViewChange('profile')()
  }, [newActiveHours, uid])

  return (
    <>
      <Grid xs={4}>
        <Select
          fullWidth
          name="day"
          value={newActiveHours.day}
          onChange={handleEdit}
        >
          {[1, 2, 3, 4, 5, 6, 7].map((day) => (
            <MenuItem key={day} dense value={day}>
              {t(`day_${day}`)}
            </MenuItem>
          ))}
        </Select>
      </Grid>
      <Grid pl={3} xs={4}>
        <OutlinedInput
          color="secondary"
          name="time"
          size="small"
          type="time"
          value={`${newActiveHours.hours}:${newActiveHours.mins}`}
          onChange={handleEdit}
        />
      </Grid>
      <Grid sm={2} textAlign="right" xs={4}>
        <IconButton size="large" onClick={handleViewChange('profile')}>
          <Clear />
        </IconButton>
        <IconButton size="large" onClick={handleAdd}>
          <Save />
        </IconButton>
      </Grid>
    </>
  )
}

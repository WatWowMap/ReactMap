// @ts-check
import * as React from 'react'
import Clear from '@mui/icons-material/Clear'
import Edit from '@mui/icons-material/Edit'
import DeleteForever from '@mui/icons-material/DeleteForever'
import Save from '@mui/icons-material/Save'
import FileCopy from '@mui/icons-material/FileCopy'
import {
  Chip,
  Typography,
  Select,
  MenuItem,
  Button,
  Divider,
  TextField,
  IconButton,
  styled,
  OutlinedInput,
} from '@mui/material'
import Grid from '@mui/material/Unstable_Grid2'

import { Trans, useTranslation } from 'react-i18next'
import { useMutation } from '@apollo/client'
import { allProfiles, setProfile } from '@services/queries/webhook'

import { useStatic } from '@hooks/useStore'

import { useWebhookStore } from './store'
import { useGetWebhookData } from './hooks'

/**
 * @typedef {'profile' | 'edit' | 'delete' | 'copy'} View
 * @typedef {{ uid: number, handleViewChange: (newView: View) => () => void}} Props
 */

const StyledDivider = styled(Divider)(({ theme }) => ({
  margin: theme.spacing(2, 0),
  width: '100%',
  height: 3,
}))

export default function ProfileEditing() {
  const { data } = useGetWebhookData('profile')

  return (
    <Grid container alignItems="center" justifyContent="center" py={2} px={4}>
      <NewProfile />
      {data.map(({ uid }) => (
        <Profile key={uid} uid={uid} />
      ))}
    </Grid>
  )
}

const NewProfile = () => {
  const { t } = useTranslation()
  const [save] = useMutation(setProfile, {
    refetchQueries: [allProfiles],
  })

  const existing = useWebhookStore((s) => new Set(s.profile.map((p) => p.name)))

  const [newProfile, setNewProfile] = React.useState('')
  const [interacted, setInteracted] = React.useState(false)

  const handleAddProfile = () => {
    setNewProfile('')
    save({
      variables: {
        category: 'profiles-add',
        data: { name: newProfile },
        status: 'POST',
      },
    })
  }

  const invalid =
    existing.has(newProfile) || newProfile === 'all' || !newProfile
  return (
    <Grid container xs={12}>
      <Grid xs={12} sm={4}>
        <Typography variant="h6" align="center">
          {t('add_new_profile')}
        </Typography>
      </Grid>
      <Grid xs={7} sm={5}>
        <TextField
          size="small"
          autoComplete="off"
          label={invalid && interacted ? t('profile_error') : t('profile_name')}
          value={newProfile}
          onChange={(event) => setNewProfile(event.target.value?.toLowerCase())}
          variant="outlined"
          error={invalid && interacted}
          onFocus={() => !interacted && setInteracted(true)}
        />
      </Grid>
      <Grid xs={3}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleAddProfile}
          disabled={invalid}
        >
          {t('save')}
        </Button>
      </Grid>
    </Grid>
  )
}

/** @param {Pick<Props, 'uid'>} props */
const Profile = ({ uid }) => {
  const [view, setView] = React.useState(/** @type {View} */ ('profile'))

  const handleViewChange = React.useCallback(
    (/** @type {View} */ newView) => () => setView(newView),
    [view],
  )
  return (
    <Grid container xs={12} justifyContent="center" alignItems="center">
      <StyledDivider flexItem />
      {
        {
          profile: (
            <ProfileView uid={uid} handleViewChange={handleViewChange} />
          ),
          edit: <EditView uid={uid} handleViewChange={handleViewChange} />,
          delete: <DeleteView uid={uid} handleViewChange={handleViewChange} />,
          copy: <CopyView uid={uid} handleViewChange={handleViewChange} />,
        }[view]
      }
    </Grid>
  )
}

/** @param {Props} props */
const ProfileView = ({ uid, handleViewChange }) => {
  const isMobile = useStatic((s) => s.isMobile)
  const profile = useWebhookStore((s) => s.profile.find((p) => p.uid === uid))

  if (!profile) return null
  return (
    <>
      <Grid xs={6} sm={2}>
        <Typography variant="h6">{profile.name}</Typography>
      </Grid>
      {isMobile && (
        <Inputs
          handleViewChange={handleViewChange}
          profileNo={profile.profile_no}
        />
      )}
      <Grid xs={12} sm={6}>
        {profile.active_hours.map((schedule) => (
          <ActiveHourChip key={schedule.id} uid={uid} {...schedule} />
        ))}
      </Grid>
      {!isMobile && (
        <Inputs
          handleViewChange={handleViewChange}
          profileNo={profile.profile_no}
        />
      )}
    </>
  )
}

/** @param {Omit<Props, 'uid'> & { profileNo: number }} props */
const Inputs = ({ profileNo, handleViewChange }) => {
  const currentProfileNo = useWebhookStore((s) => s.human.current_profile_no)

  return (
    <Grid sm={4} textAlign="right">
      <IconButton onClick={handleViewChange('edit')} size="large">
        <Edit />
      </IconButton>
      <IconButton
        onClick={handleViewChange('delete')}
        disabled={profileNo === currentProfileNo}
        size="large"
      >
        <DeleteForever />
      </IconButton>
      <IconButton onClick={handleViewChange('copy')} size="large">
        <FileCopy />
      </IconButton>
    </Grid>
  )
}

const StyledChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.5),
}))

StyledChip.defaultProps = /** @type {const} */ ({
  clickable: true,
  deleteIcon: <Clear />,
  size: 'small',
  color: 'secondary',
})

/** @param {import('types').PoracleActiveHours & { uid: number }} props */
const ActiveHourChip = ({ day, hours, mins, uid, id }) => {
  const { t } = useTranslation()
  const [save] = useMutation(setProfile, {
    refetchQueries: [allProfiles],
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

/** @param {Props} props */
const EditView = ({ handleViewChange, uid }) => {
  const { t } = useTranslation()
  const [save] = useMutation(setProfile, {
    refetchQueries: [allProfiles],
  })

  const [newActiveHours, setNewActiveHours] = React.useState({
    day: 1,
    hours: 0,
    mins: 0,
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
        { ...newActiveHours, id: active.active_hours.length },
      ],
    }
    save({
      variables: {
        category: 'profiles-update',
        data: editedProfile,
        status: 'POST',
      },
    })
    handleViewChange('profile')()
  }, [])

  return (
    <>
      <Grid xs={4}>
        <Select
          name="day"
          value={newActiveHours.day}
          onChange={handleEdit}
          fullWidth
        >
          {[1, 2, 3, 4, 5, 6, 7].map((day) => (
            <MenuItem key={day} value={day} dense>
              {t(`day_${day}`)}
            </MenuItem>
          ))}
        </Select>
      </Grid>
      <Grid xs={4} pl={3}>
        <OutlinedInput
          name="time"
          color="secondary"
          value={`${newActiveHours.hours}:${newActiveHours.mins}`}
          onChange={handleEdit}
          size="small"
          type="time"
        />
      </Grid>
      <Grid xs={4} sm={2} textAlign="right">
        <IconButton onClick={handleViewChange('profile')} size="large">
          <Clear />
        </IconButton>
        <IconButton onClick={handleAdd} size="large">
          <Save />
        </IconButton>
      </Grid>
    </>
  )
}

/** @param {Props} props */
const DeleteView = ({ handleViewChange, uid }) => {
  const { t } = useTranslation()
  const [save] = useMutation(setProfile, {
    refetchQueries: [allProfiles],
  })

  const profileNo = useWebhookStore(
    (s) => s.profile.find((p) => p.uid === uid)?.profile_no,
  )

  const handleRemove = () => {
    save({
      variables: {
        category: 'profiles-byProfileNo',
        data: profileNo,
        status: 'DELETE',
      },
    })
  }

  return (
    <>
      <Grid xs={6} sm={8}>
        <Typography variant="subtitle2" align="center">
          {t('confirm_delete')}
        </Typography>
      </Grid>
      <Grid xs={4} sm={2}>
        <IconButton onClick={handleViewChange('profile')} size="large">
          <Clear />
        </IconButton>
        <IconButton onClick={handleRemove} size="large">
          <Save />
        </IconButton>
      </Grid>
    </>
  )
}

/** @param {Props} props */
const CopyView = ({ uid, handleViewChange }) => {
  const [save] = useMutation(setProfile, {
    refetchQueries: [allProfiles],
  })

  const profiles = useWebhookStore((s) => s.profile)
  const profile = profiles.find((p) => p.uid === uid)

  const [copyTo, setCopyTo] = React.useState(0)

  const handleCopyProfile = () => {
    if (copyTo !== 0) {
      handleViewChange('profile')()
      save({
        variables: {
          category: 'profiles-copy',
          data: {
            from: profile.profile_no,
            to: copyTo,
          },
          status: 'POST',
        },
      })
    }
  }

  if (!profile) return null
  return (
    <>
      <Grid xs={8} sm={7}>
        <Typography variant="subtitle2" align="center">
          <Trans i18nKey="confirm_copy">{{ profile: profile.name }}</Trans>
        </Typography>
      </Grid>
      <Grid container xs={4} alignItems="center" justifyContent="center">
        <Grid xs={12} sm={6}>
          <Select
            value={copyTo || ''}
            onChange={(e) => setCopyTo(+e.target.value)}
            fullWidth
          >
            {profiles
              .filter((prof) => profile.profile_no !== prof.profile_no)
              .map((prof) => (
                <MenuItem key={prof.uid} value={prof.profile_no}>
                  {prof.name}
                </MenuItem>
              ))}
          </Select>
        </Grid>
        <Grid xs={12} sm={6}>
          <IconButton onClick={handleViewChange('profile')} size="large">
            <Clear />
          </IconButton>
          <IconButton
            onClick={handleCopyProfile}
            disabled={profile.profile_no === copyTo}
            size="large"
          >
            <Save />
          </IconButton>
        </Grid>
      </Grid>
    </>
  )
}

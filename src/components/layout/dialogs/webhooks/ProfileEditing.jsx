import * as React from 'react'
import Clear from '@mui/icons-material/Clear'
import Edit from '@mui/icons-material/Edit'
import DeleteForever from '@mui/icons-material/DeleteForever'
import Save from '@mui/icons-material/Save'
import FileCopy from '@mui/icons-material/FileCopy'
import {
  DialogContent,
  Grid,
  Chip,
  Typography,
  Input,
  Select,
  MenuItem,
  Button,
  Divider,
  TextField,
  IconButton,
} from '@mui/material'

import { Trans, useTranslation } from 'react-i18next'
import { useMutation } from '@apollo/client'

import Query from '@services/Query'

import Header from '@components/layout/general/Header'
import Footer from '@components/layout/general/Footer'
import { useStatic, useStore } from '@hooks/useStore'
import { useWebhookStore } from './store'

const profilesObject = (data) =>
  data
    ? Object.fromEntries(
        data.map((profile) => {
          const newProfile = { ...profile, active_hours: [] }
          const parsed = Array.isArray(profile.active_hours)
            ? profile.active_hours
            : JSON.parse(profile.active_hours)
          if (Array.isArray(parsed)) {
            const sorted = parsed.sort((a, b) =>
              a.day === a.bday ? a.hours - b.hours : a.day - b.day,
            )
            sorted.forEach((schedule, i) => {
              newProfile.active_hours.push({ ...schedule, id: i })
            })
          }
          return [profile.name, newProfile]
        }),
      )
    : {}

export default function ProfileEditing({ handleClose }) {
  const { t } = useTranslation()

  const selectedWebhook = useStore((s) => s.selectedWebhook)
  const isMobile = useStatic((s) => s.isMobile)
  const webhookData = useWebhookStore((s) => s.data[selectedWebhook])

  const [syncWebhook, { data }] = useMutation(Query.webhook('setProfile'), {
    fetchPolicy: 'no-cache',
  })

  const [profiles, setProfiles] = React.useState(
    profilesObject(webhookData.profile),
  )
  const [copyTo, setCopyTo] = React.useState(
    Object.fromEntries(webhookData.profile.map((x) => [x.name, x.name])),
  )
  const [views, setViews] = React.useState(
    Object.fromEntries(webhookData.profile.map((x) => [x.name, 'profile'])),
  )
  const [newSchedule, setNewSchedule] = React.useState({
    day: 1,
    hours: '00',
    mins: '00',
  })
  const [newProfile, setNewProfile] = React.useState('')

  const handleAddProfile = () => {
    setProfiles({
      ...profiles,
      [newProfile]: { name: newProfile, active_hours: [] },
    })
    setViews({ ...views, [newProfile]: 'profile' })
    setNewProfile('')
    syncWebhook({
      variables: {
        category: 'profiles-add',
        data: { name: newProfile },
        status: 'POST',
        name: selectedWebhook,
      },
    })
  }

  const handleRemoveProfile = (profile) => {
    syncWebhook({
      variables: {
        category: 'profiles-byProfileNo',
        data: profiles[profile].profile_no,
        status: 'DELETE',
        name: selectedWebhook,
      },
    })
    // eslint-disable-next-line no-unused-vars
    const { [profile]: _, ...rest } = profiles
    setProfiles({ ...rest })
  }

  const handleCopyProfile = (profile) => {
    syncWebhook({
      variables: {
        category: 'profiles-copy',
        data: {
          from: profiles[profile].profile_no,
          to: profiles[copyTo[profile]].profile_no,
        },
        status: 'POST',
        name: selectedWebhook,
      },
    })
    setViews((prev) => ({ ...prev, [profile]: 'profile' }))
  }

  const handleAddSchedule = (profile) => {
    const active = profiles[profile]
    const editedProfile = {
      ...active,
      active_hours: [
        ...active.active_hours,
        { ...newSchedule, id: active.active_hours.length },
      ],
    }
    setProfiles((prev) => ({ ...prev, [profile]: editedProfile }))
    setViews((prev) => ({ ...prev, [profile]: 'profile' }))
    syncWebhook({
      variables: {
        category: 'profiles-update',
        data: editedProfile,
        status: 'POST',
        name: selectedWebhook,
      },
    })
  }

  const handleRemoveSchedule = (profile, id) => {
    const newProfileObj = {
      ...profiles,
      [profile]: {
        ...profiles[profile],
        active_hours: profiles[profile].active_hours.filter(
          (schedule) => schedule.id !== id,
        ),
      },
    }
    setProfiles(newProfileObj)
    syncWebhook({
      variables: {
        category: 'profiles-update',
        data: newProfileObj[profile],
        status: 'POST',
        name: selectedWebhook,
      },
    })
  }

  const handleScheduleAdjustments = (event) => {
    const { name, value } = event.target
    if (name === 'day') {
      setNewSchedule({ ...newSchedule, day: +value })
    } else {
      const [hours, mins] = value.split(':')
      setNewSchedule({ ...newSchedule, hours, mins })
    }
  }

  const handleCloseMenu = () => {
    // setData(Object.values(profiles), 'profile')
    handleClose('profiles')
  }

  const handleViewChange = React.useCallback((profile, view) => {
    setViews((prev) => ({ ...prev, [profile]: view }))
  }, [])

  React.useEffect(() => {
    if (data?.webhook?.profile) {
      // setData(data.webhook.profile, 'profile')
      setProfiles(profilesObject(data.webhook.profile))
    }
  }, [data])

  return (
    <>
      <Header titles={['manage_profiles']} action={() => handleClose(false)} />
      <DialogContent sx={{ my: 2 }}>
        <Grid
          container
          spacing={2}
          alignItems="center"
          justifyContent="center"
          py={2}
        >
          <Grid item xs={12} sm={4}>
            <Typography variant="h6" align="center">
              {t('add_new_profile')}
            </Typography>
          </Grid>
          <Grid item xs={7} sm={5}>
            <TextField
              size="small"
              autoComplete="off"
              label={
                profiles[newProfile] || newProfile === 'all'
                  ? t('profile_error')
                  : t('profile_name')
              }
              value={newProfile}
              onChange={(event) =>
                setNewProfile(event.target.value?.toLowerCase())
              }
              variant="outlined"
              error={Boolean(profiles[newProfile]) || newProfile === 'all'}
            />
          </Grid>
          <Grid item xs={3}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleAddProfile}
              disabled={
                Boolean(profiles[newProfile]) ||
                !newProfile ||
                newProfile === 'all'
              }
            >
              {t('save')}
            </Button>
          </Grid>
          <Divider
            flexItem
            light
            style={{ margin: '10px 0', width: '90%', height: 3 }}
          />
          <Grid item xs={12}>
            {Object.entries(profiles).map(([profileName, fullProfile], i) => {
              const disabled =
                fullProfile.profile_no === webhookData.human.current_profile_no
              return (
                <Grid
                  key={profileName}
                  container
                  spacing={2}
                  justifyContent="center"
                  alignItems="center"
                >
                  {Boolean(i) && (
                    <Divider
                      flexItem
                      light
                      style={{ margin: '20px 0', width: '90%', height: 3 }}
                    />
                  )}
                  {
                    {
                      profile: (
                        <>
                          <Grid item xs={6} sm={2}>
                            <Typography variant="h6">{profileName}</Typography>
                          </Grid>
                          {isMobile && (
                            <Inputs
                              disabled={disabled}
                              handleViewChange={handleViewChange}
                              profileName={profileName}
                            />
                          )}
                          <Grid item xs={12} sm={6}>
                            {profiles[profileName].active_hours.map(
                              (schedule) => (
                                <Chip
                                  key={schedule.id}
                                  label={`${t(`day_${schedule.day}`)} ${
                                    schedule.hours
                                  }:${String(schedule.mins).padStart(2, '0')}`}
                                  clickable
                                  deleteIcon={<Clear />}
                                  size={isMobile ? 'small' : 'medium'}
                                  color="secondary"
                                  onDelete={() =>
                                    handleRemoveSchedule(
                                      profileName,
                                      schedule.id,
                                    )
                                  }
                                  style={{ margin: 3 }}
                                />
                              ),
                            )}
                          </Grid>
                          {!isMobile && (
                            <Inputs
                              disabled={disabled}
                              handleViewChange={handleViewChange}
                              profileName={profileName}
                            />
                          )}
                        </>
                      ),
                      edit: (
                        <>
                          <Grid item xs={4}>
                            <Select
                              name="day"
                              value={newSchedule.day}
                              onChange={handleScheduleAdjustments}
                              fullWidth
                            >
                              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                                <MenuItem key={day} value={day} dense>
                                  {t(`day_${day}`)}
                                </MenuItem>
                              ))}
                            </Select>
                          </Grid>
                          <Grid item xs={4}>
                            <Input
                              name="time"
                              color="secondary"
                              label="new time"
                              value={`${newSchedule.hours}:${newSchedule.mins}`}
                              onChange={handleScheduleAdjustments}
                              variant="outlined"
                              size="small"
                              type="time"
                            />
                          </Grid>
                          <Grid
                            item
                            xs={4}
                            sm={2}
                            style={{ textAlign: 'right' }}
                          >
                            <IconButton
                              onClick={() =>
                                setViews({ ...views, [profileName]: 'profile' })
                              }
                              size="large"
                            >
                              <Clear />
                            </IconButton>
                            <IconButton
                              onClick={() => handleAddSchedule(profileName)}
                              size="large"
                            >
                              <Save />
                            </IconButton>
                          </Grid>
                        </>
                      ),
                      delete: (
                        <>
                          <Grid item xs={6} sm={8}>
                            <Typography variant="subtitle2" align="center">
                              {t('confirm_delete')}
                            </Typography>
                          </Grid>
                          <Grid item xs={4} sm={2}>
                            <IconButton
                              onClick={() =>
                                setViews({ ...views, [profileName]: 'profile' })
                              }
                              size="large"
                            >
                              <Clear />
                            </IconButton>
                            <IconButton
                              onClick={() => handleRemoveProfile(profileName)}
                              size="large"
                            >
                              <Save />
                            </IconButton>
                          </Grid>
                        </>
                      ),
                      copy: (
                        <>
                          <Grid item xs={8} sm={7}>
                            <Typography variant="subtitle2" align="center">
                              <Trans i18nKey="confirm_copy">
                                {{ profile: profileName }}
                              </Trans>
                            </Typography>
                          </Grid>
                          <Grid
                            item
                            container
                            xs={4}
                            alignItems="center"
                            justifyContent="center"
                          >
                            <Grid item xs={12} sm={6}>
                              <Select
                                value={copyTo[profileName] || ''}
                                onChange={(e) =>
                                  setCopyTo({
                                    ...copyTo,
                                    [profileName]: e.target.value,
                                  })
                                }
                                fullWidth
                              >
                                {Object.keys(profiles).map((prof) => (
                                  <MenuItem key={prof} value={prof}>
                                    {prof}
                                  </MenuItem>
                                ))}
                              </Select>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <IconButton
                                onClick={() =>
                                  setViews({
                                    ...views,
                                    [profileName]: 'profile',
                                  })
                                }
                                size="large"
                              >
                                <Clear />
                              </IconButton>
                              <IconButton
                                onClick={() => handleCopyProfile(profileName)}
                                disabled={profileName === copyTo[profileName]}
                                size="large"
                              >
                                <Save />
                              </IconButton>
                            </Grid>
                          </Grid>
                        </>
                      ),
                    }[views[profileName]]
                  }
                </Grid>
              )
            })}
          </Grid>
        </Grid>
      </DialogContent>
      <Footer
        options={[
          {
            name: 'save',
            action: handleCloseMenu,
            icon: 'Save',
          },
        ]}
        role="webhook_advanced"
      />
    </>
  )
}

const Inputs = ({ profileName, disabled, handleViewChange }) => (
  <Grid item sm={6} style={{ textAlign: 'right' }}>
    <IconButton
      onClick={() => handleViewChange(profileName, 'edit')}
      size="large"
    >
      <Edit />
    </IconButton>
    <IconButton
      onClick={() => handleViewChange(profileName, 'delete')}
      disabled={disabled}
      size="large"
    >
      <DeleteForever />
    </IconButton>
    <IconButton
      onClick={() => handleViewChange(profileName, 'copy')}
      size="large"
    >
      <FileCopy />
    </IconButton>
  </Grid>
)

// const currentProfile = useWebhookStore(
//   (s) => s.data[selectedWebhook].human.current_profile_no,
// )
// const disabled = currentProfile === profiles[profile].profile_no

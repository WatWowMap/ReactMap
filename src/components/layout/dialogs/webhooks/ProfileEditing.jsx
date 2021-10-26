import React, { useEffect, useState } from 'react'
import {
  DialogContent, Grid, Chip, Typography, Input, Select, MenuItem, Button, Divider, TextField,
} from '@material-ui/core'
import { Clear } from '@material-ui/icons'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@apollo/client'

import Query from '@services/Query'

import Header from '@components/layout/general/Header'
import Footer from '@components/layout/general/Footer'

export default function ProfileEditing({
  webhookData, setWebhookData, selectedWebhook, handleClose, isMobile,
}) {
  const { t } = useTranslation()
  const [syncWebhook, { data }] = useMutation(Query.webhook('setProfile'))
  const [profiles, setProfiles] = useState(webhookData[selectedWebhook].profile.map(profile => {
    const newProfile = { ...profile, active_hours: [] }
    const parsed = JSON.parse(profile.active_hours)
    if (Array.isArray(parsed)) {
      const sorted = parsed.sort((a, b) => a.day === a.bday ? a.hours - b.hours : a.day - b.day)
      sorted.forEach((schedule, i) => {
        newProfile.active_hours.push({ ...schedule, id: i })
      })
    }
    return newProfile
  }))
  const [newProfile, setNewProfile] = useState('')
  const [newSchedule, setNewSchedule] = useState(profiles.map((x) => (x ? { day: 1, hours: '00', mins: '00' } : null)))

  const handleAddProfile = () => {
    setProfiles([...profiles, { name: newProfile, active_hours: [] }])
    setNewSchedule([...newSchedule, { day: 1, hours: '00', mins: '00' }])
    setNewProfile('')
  }

  const handleRemove = (profileIndex, id) => {
    profiles[profileIndex].active_hours = profiles[profileIndex].active_hours.filter(schedule => schedule.id !== id)
    setProfiles([...profiles])
  }

  const handleScheduleChange = (profileIndex, event) => {
    const { name, value } = event.target
    if (name === 'day') {
      newSchedule[profileIndex] = { ...newSchedule[profileIndex], day: +value }
    } else {
      const [hours, mins] = value.split(':')
      newSchedule[profileIndex] = { ...newSchedule[profileIndex], hours, mins }
    }
    setNewSchedule([...newSchedule])
  }

  const handleSubmit = (profileIndex) => {
    const { length } = profiles[profileIndex].active_hours
    profiles[profileIndex].active_hours.push({ ...newSchedule[profileIndex], id: length })
    setProfiles([...profiles])
  }

  useEffect(() => {
    if (data?.webhook?.profile) {
      setWebhookData({
        ...webhookData,
        [selectedWebhook]: {
          ...webhookData[selectedWebhook],
          profile: data.webhooks.profile,
        },
      })
      handleClose(false)
    }
  }, [data])

  return (
    <>
      <Header
        titles={['manage_profiles']}
        action={() => handleClose(false)}
      />
      <DialogContent style={{ marginBottom: 20 }}>
        <Grid container spacing={2} alignItems="center" justifyContent="center">
          <Grid item xs={12} sm={4}>
            <Typography variant="h6" align="center">
              {t('addNewProfile')}
            </Typography>
          </Grid>
          <Grid item xs={7} sm={5}>
            <TextField
              autoComplete="off"
              label={t('profile_name')}
              value={newProfile}
              onChange={(event) => setNewProfile(event.target.value.toLowerCase())}
              variant="outlined"
            />
          </Grid>
          <Grid item xs={3}>
            <Button variant="contained" color="primary" onClick={handleAddProfile}>{t('save')}</Button>
          </Grid>
          <Divider flexItem light style={{ margin: 20, width: '90%', height: 3 }} />
          <Grid item xs={12}>
            {profiles.map((profile, i) => (
              <Grid key={profile.name} container spacing={2} justifyContent="center" alignItems="center">
                {Boolean(i) && <Divider flexItem light style={{ margin: 20, width: '90%', height: 3 }} />}
                <Grid item xs={12} md={2}>
                  <Typography variant="h6">
                    {profile.name}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={5}>
                  {profile.active_hours.map(schedule => (
                    <Chip
                      key={schedule.id}
                      label={`${t(`day_${schedule.day}`)} ${schedule.hours}:${String(schedule.mins).padStart(2, '0')}`}
                      clickable
                      variant="default"
                      deleteIcon={<Clear />}
                      size={isMobile ? 'small' : 'medium'}
                      color="secondary"
                      onDelete={() => handleRemove(i, schedule.id)}
                      style={{ margin: 3 }}
                    />
                  ))}
                </Grid>
                <Grid container item xs={12} md={5} justifyContent="center" alignItems="center">
                  <Grid item xs={4}>
                    <Select
                      name="day"
                      value={newSchedule[i].day}
                      onChange={(event) => handleScheduleChange(i, event)}
                      fullWidth
                    >
                      {[1, 2, 3, 4, 5, 6, 7].map(day => (
                        <MenuItem
                          key={day}
                          value={day}
                          dense
                        >
                          {t(`day_${day}`)}
                        </MenuItem>
                      ))}
                    </Select>
                  </Grid>
                  <Grid item xs={5}>
                    <Input
                      name="time"
                      color="secondary"
                      label="new time"
                      value={`${newSchedule[i].hours}:${newSchedule[i].mins}`}
                      onChange={(event) => handleScheduleChange(i, event)}
                      variant="outlined"
                      size="small"
                      type="time"
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <Button
                      color="primary"
                      onClick={(event) => handleSubmit(i, event)}
                      variant="contained"
                      size="small"
                    >
                      {t('add')}
                    </Button>
                  </Grid>
                </Grid>
              </Grid>
            ))}
          </Grid>
        </Grid>
      </DialogContent>
      <Footer
        options={[{
          name: 'save',
          action: () => syncWebhook({
            variables: {
              category: 'newProfile',
              data: profiles,
              status: 'POST',
              name: selectedWebhook,
            },
          }),
          icon: 'Save',
        }]}
        role="webhookAdvanced"
      />
    </>
  )
}

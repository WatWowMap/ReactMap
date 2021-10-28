import React, { useEffect, useState } from 'react'
import {
  DialogContent, Grid, Chip, Typography, Input, Select, MenuItem, Button, Divider, TextField, IconButton,
} from '@material-ui/core'
import {
  Clear, Edit, DeleteForever, Save, FileCopy,
} from '@material-ui/icons'
import { Trans, useTranslation } from 'react-i18next'
import { useMutation } from '@apollo/client'

import Query from '@services/Query'

import Header from '@components/layout/general/Header'
import Footer from '@components/layout/general/Footer'

export default function ProfileEditing({
  webhookData, setWebhookData, selectedWebhook, handleClose, isMobile,
}) {
  const { t } = useTranslation()
  const [syncWebhook, { data }] = useMutation(Query.webhook('setProfile'))
  const [profiles, setProfiles] = useState(Object.fromEntries(webhookData[selectedWebhook].profile.map(profile => {
    const newProfile = { ...profile, active_hours: [] }
    const parsed = JSON.parse(profile.active_hours)
    if (Array.isArray(parsed)) {
      const sorted = parsed.sort((a, b) => a.day === a.bday ? a.hours - b.hours : a.day - b.day)
      sorted.forEach((schedule, i) => {
        newProfile.active_hours.push({ ...schedule, id: i })
      })
    }
    return [profile.name, newProfile]
  })))
  const [copyTo, setCopyTo] = useState(
    Object.fromEntries(webhookData[selectedWebhook].profile.map((x) => [x.name, x.name])),
  )
  const [views, setViews] = useState(
    Object.fromEntries(webhookData[selectedWebhook].profile.map((x) => [x.name, 'profile'])),
  )
  const [newSchedule, setNewSchedule] = useState({ day: 1, hours: '00', mins: '00' })
  const [newProfile, setNewProfile] = useState('')

  const handleAddProfile = () => {
    setProfiles({ ...profiles, [newProfile]: { name: newProfile, active_hours: [] } })
    setViews({ ...views, [newProfile]: 'profile' })
    setNewProfile('')
  }

  const handleRemove = (profile, id) => {
    profiles[profile].active_hours = profiles[profile].active_hours.filter(schedule => schedule.id !== id)
    setProfiles({ ...profiles })
  }

  const handleScheduleChange = (event) => {
    const { name, value } = event.target
    if (name === 'day') {
      setNewSchedule({ ...newSchedule, day: +value })
    } else {
      const [hours, mins] = value.split(':')
      setNewSchedule({ ...newSchedule, hours, mins })
    }
  }

  const handleDelete = (profile) => {
    delete profiles[profile]
    setProfiles({ ...profiles })
  }

  const handleAddSchedule = (profile) => {
    const active = profiles[profile]
    const editedProfile = {
      ...active, active_hours: [...active.active_hours, { ...newSchedule, id: active.active_hours.length }],
    }
    setProfiles({ ...profiles, [profile]: editedProfile })
    setViews({ ...views, [profile]: 'profile' })
  }

  const getInputs = (profile) => (
    <Grid item sm={isMobile ? 6 : 3} style={{ textAlign: 'right' }}>
      <IconButton onClick={() => setViews({ ...views, [profile]: 'edit' })}>
        <Edit />
      </IconButton>
      <IconButton onClick={() => setViews({ ...views, [profile]: 'delete' })}>
        <DeleteForever />
      </IconButton>
      <IconButton onClick={() => setViews({ ...views, [profile]: 'copy' })}>
        <FileCopy />
      </IconButton>
    </Grid>
  )

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
              onChange={(event) => setNewProfile(event.target.value)}
              variant="outlined"
            />
          </Grid>
          <Grid item xs={3}>
            <Button variant="contained" color="primary" onClick={handleAddProfile}>{t('save')}</Button>
          </Grid>
          <Divider flexItem light style={{ margin: '10px 0', width: '90%', height: 3 }} />
          <Grid item xs={12}>
            {Object.keys(profiles).map((profile, i) => (
              <Grid key={profile} container spacing={2} justifyContent="center" alignItems="center">
                {Boolean(i) && <Divider flexItem light style={{ margin: '20px 0', width: '90%', height: 3 }} />}
                {{
                  profile: (
                    <>
                      <Grid item xs={6} sm={2}>
                        <Typography variant="h6">
                          {profile}
                        </Typography>
                      </Grid>
                      {isMobile && getInputs(profile)}
                      <Grid item xs={12} sm={6}>
                        {profiles[profile].active_hours.map(schedule => (
                          <Chip
                            key={schedule.id}
                            label={`${t(`day_${schedule.day}`)} ${schedule.hours}:${String(schedule.mins).padStart(2, '0')}`}
                            clickable
                            variant="default"
                            deleteIcon={<Clear />}
                            size={isMobile ? 'small' : 'medium'}
                            color="secondary"
                            onDelete={() => handleRemove(profile, schedule.id)}
                            style={{ margin: 3 }}
                          />
                        ))}
                      </Grid>
                      {!isMobile && getInputs(profile)}
                    </>
                  ),
                  edit: (
                    <>
                      <Grid item xs={4}>
                        <Select
                          name="day"
                          value={newSchedule.day}
                          onChange={handleScheduleChange}
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
                      <Grid item xs={4}>
                        <Input
                          name="time"
                          color="secondary"
                          label="new time"
                          value={`${newSchedule.hours}:${newSchedule.mins}`}
                          onChange={handleScheduleChange}
                          variant="outlined"
                          size="small"
                          type="time"
                        />
                      </Grid>
                      <Grid item xs={4} sm={2} style={{ textAlign: 'right' }}>
                        <IconButton onClick={() => setViews({ ...views, [profile]: 'profile' })}>
                          <Clear />
                        </IconButton>
                        <IconButton onClick={() => handleAddSchedule(profile)}>
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
                        <IconButton onClick={() => setViews({ ...views, [profile]: 'profile' })}>
                          <Clear />
                        </IconButton>
                        <IconButton onClick={() => handleDelete(profile)}>
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
                            {{ profile }}
                          </Trans>
                        </Typography>
                      </Grid>
                      <Grid item container xs={4} alignItems="center" justifyContent="center">
                        <Grid item xs={12} sm={6}>
                          <Select
                            value={copyTo[profile]}
                            onChange={(e) => setCopyTo({ ...copyTo, [profile]: e.target.value })}
                            fullWidth
                          >
                            {Object.keys(profiles).map((prof) => (
                              <MenuItem key={prof} value={prof}>{prof}</MenuItem>
                            ))}
                          </Select>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <IconButton onClick={() => setViews({ ...views, [profile]: 'profile' })}>
                            <Clear />
                          </IconButton>
                          <IconButton onClick={() => setViews({ ...views, [profile]: 'profile' })}>
                            <Save />
                          </IconButton>
                        </Grid>
                      </Grid>
                    </>
                  ),
                }[views[profile]]}
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

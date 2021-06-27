import React, { useState } from 'react'
import {
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  TextField,
  FormControl,
  Select,
  InputLabel,
  Divider,
} from '@material-ui/core'
import { useTranslation } from 'react-i18next'

import useStyles from '@hooks/useStyles'
import { useStatic } from '@hooks/useStore'
import Axios from 'axios'
import UserPerms from './UserPerms'

export default function UserProfile({ setUserProfile }) {
  const classes = useStyles()
  const { t } = useTranslation()
  const { enabledAuthMethods, customAuthSettings, profileData } = useStatic(state => state.auth)
  const { manualAreas, map: { enableUserPerms } } = useStatic(state => state.config)

  const discordRegex = /^((?!(discordtag|everyone|here)#)((?!@|#|:|```).{2,32})#\d{4}$)/i
  const [updateDiscordNickname, setUpdateDiscordNickname] = useState(profileData.discordNickname)
  const [resetDiscordId, setResetDiscordId] = useState(false)
  const [updateDiscordNicknameTest, setUpdateDiscordNicknameTest] = useState(true)
  const [updateArea, setUpdateArea] = useState(profileData.area)
  const [updateProfile, setUpdateProfile] = useState(false)
  const [userPerms, setUserPerms] = useState(false)

  const handleChange = (type, value) => {
    setUpdateProfile(false)
    if (type === 'discordNickname') {
      if ((value !== profileData.discordNickname
        || updateArea !== profileData.area)
        && discordRegex.test(value)) {
        setUpdateProfile(true)
      }
    } else if (type === 'area') {
      if ((value !== profileData.area
      || updateDiscordNickname !== profileData.discordNickname)
      && updateDiscordNicknameTest) {
        setUpdateProfile(true)
      }
    }
    if ((type === 'discordNickname' && value !== profileData.discordNickname)
      || updateDiscordNickname !== profileData.discordNickname) {
      setResetDiscordId(true)
    } else {
      setResetDiscordId(false)
    }
  }

  const handleProfileUpdate = async () => {
    if (updateDiscordNickname === profileData.discordNickname && updateArea === profileData.area) return
    const update = await Axios({
      method: 'POST',
      data: {
        sessionUserId: profileData.sessionUserId,
        username: profileData.username,
        updateProfileData: {
          discordNickname: updateDiscordNickname.toLowerCase(),
          discordId: resetDiscordId ? '' : profileData.discordId,
          area: updateArea,
        },
      },
      withCredentials: true,
      url: '/auth/update',
    }).then((response) => response.data)
    if (update.updateSuccessful) {
      profileData.discordNickname = updateDiscordNickname.toLowerCase()
      profileData.discordId = resetDiscordId ? '' : profileData.discordId
      profileData.area = updateArea
      setUpdateProfile(false)
    }
  }

  const getStatusCode = (userStatus) => {
    if (enabledAuthMethods.includes('customAuth')) {
      switch (userStatus) {
        case customAuthSettings.emailConfirmedStatus:
          return 'confirmedStatus'
        case customAuthSettings.donorStatus:
          return 'donorStatus'
        case customAuthSettings.adminStatus:
          return 'adminStatus'
        default:
          return 'visitorStatus'
      }
    }
  }

  const getExpirationDate = (MySQLDate) => {
    const date = MySQLDate.split(/[- T:]/)
    return t('dateFormat').replace('{d}', date[2]).replace('{m}', date[1]).replace('{y}', date[0])
  }

  return (
    <>
      <DialogTitle className={classes.filterHeader}>
        {t('userProfile')}
      </DialogTitle>
      <DialogContent>
        <Grid
          container
          direction="column"
          alignItems="stretch"
          justify="center"
          spacing={2}
        >
          <Grid item spacing={2}>
            {profileData.username && <Typography align="left">{t('username')} : {profileData.username}</Typography>}
            {profileData.email && <Typography align="left">{t('email')} : {profileData.email}</Typography>}
            <Typography align="left">
              {t('status')} : {t(getStatusCode(profileData.status))}{profileData.donorExpirationDate ? (` (${t('untilDate')} ${getExpirationDate(profileData.donorExpirationDate)})`) : null}
            </Typography>
          </Grid>
          <Divider />
          <Grid item>
            <TextField
              id="updateDiscordNickname"
              label={t('discordNickname')}
              fullWidth="true"
              margin="normal"
              variant="outlined"
              InputProps={{
                style: { color: `${!updateDiscordNicknameTest ? 'red' : 'white'}` },
                readOnly: !profileData.username,
              }}
              value={updateDiscordNickname}
              onChange={(e) => {
                setUpdateDiscordNickname(e.target.value)
                if (e.target.value && !discordRegex.test(e.target.value)) {
                  setUpdateDiscordNicknameTest(false)
                  setUpdateProfile(false)
                } else {
                  handleChange('discordNickname', e.target.value)
                  setUpdateDiscordNicknameTest(true)
                }
              }}
            />
            <Typography variant="body2" align="center">{t('discordId')} : {profileData.discordId ? profileData.discordId : '-'}</Typography>
          </Grid>
          {Object.keys(manualAreas).length > 0 && profileData.area && (
            <>
              <Divider />
              <Grid item>
                <FormControl
                  fullWidth="true"
                  margin="normal"
                  variant="outlined"
                  required
                >
                  <InputLabel htmlFor="updateArea">{t('area')}</InputLabel>
                  <Select
                    native
                    value={updateArea}
                    onChange={(e) => { setUpdateArea(e.target.value); handleChange('area', e.target.value) }}
                    label={t('area')}
                    inputProps={{
                      name: 'updateArea',
                      id: 'updateArea',
                    }}
                  >
                    {Object.keys(manualAreas).map(area => (
                      <option value={area}>{area}</option>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Grid
          container
          justify={enableUserPerms ? 'space-between' : 'flex-end'}
          alignItems="center"
          spacing={2}
        >
          {enableUserPerms && (
            <Grid item>
              <Button
                style={{ minWidth: 100 }}
                variant="contained"
                color="secondary"
                size="small"
                onClick={() => setUserPerms(true)}
              >
                {t('perms')}
              </Button>
            </Grid>
          )}
          {updateProfile && (
            <Grid item>
              <Button onClick={() => handleProfileUpdate()} color="primary">
                {t('save')}
              </Button>
            </Grid>
          )}
          <Grid item>
            <Button onClick={() => setUserProfile(false)} color="secondary">
              {t('close')}
            </Button>
          </Grid>
        </Grid>
      </DialogActions>
      {enableUserPerms && (
        <Dialog
          open={userPerms}
          onClose={() => setUserPerms(false)}
          fullWidth
        >
          <UserPerms setUserPerms={setUserPerms} />
        </Dialog>
      )}
    </>
  )
}

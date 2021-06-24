const router = require('express').Router()
const passport = require('passport')
const {
  isValidSession,
  clearOtherSessions,
  updateSessionProfileDataByUserId,
  updateSessionProfileDataByDiscordNickname
} = require('../services/session-store.js')
const CustomAuthClient = require('../services/customAuth')

router.post('/local',
  passport.authenticate('local', {
    failureRedirect: '/login',
  }),
  async (req, res) => {
    try {
      const { id } = req.session.passport.user
      if (!(await isValidSession(id))) {
        console.debug('[Session] Detected multiple sessions, clearing old ones...')
        await clearOtherSessions(id, req.sessionID)
      }
      if (!req.session.passport.user.valid && req.session.passport.user.authenticationErrorCode) {
        res.status(200).json({ authenticationSuccess: false,
          message: 'User authentication failed', errorCode: req.session.passport.user.authenticationErrorCode })
      } else {
        res.status(200).json({ authenticationSuccess: true,
          message: 'User successfully authenticated', errorCode: '' })
      }
    } catch (error) {
      res.status(500).json({ error })
    }
  })

router.get('/discord', passport.authenticate('discord'))

router.get('/discord/callback',
  passport.authenticate('discord', {
    failureRedirect: '/',
  }),
  async (req, res) => {
    try {
      const { id } = req.session.passport.user
      const { discordNickname } = req.session.passport.user.profileData
      if (!(await isValidSession(id))) {
        console.debug('[Session] Detected multiple sessions, clearing old ones...')
        await clearOtherSessions(id, req.sessionID)
      }
      await updateSessionProfileDataByDiscordNickname(discordNickname, 'discordId', id)
      res.redirect('/')
    } catch (error) {
      res.status(500).json({ error })
    }
  })

router.post('/register', async function (req, res) {
  try {
    const registerData = req.body
    const registration = await CustomAuthClient.register(registerData)
    const response = { registrationSuccessful: registration.isSuccessful, message: registration.message }
    res.status(200).json(response)
  } catch (error) {
    res.status(500).json({ error })
  }
})

router.get('/confirmation/:username/:code', async function (req, res) {
  try {
    const confirmationData = { confirmationUsername: req.params.username, confirmationCode: req.params.code }
    const confirmation = await CustomAuthClient.confirm(confirmationData)
    if (confirmation.isSuccessful) {
      res.redirect('/login')
    } else {
      res.send(confirmation.message)
    }
  } catch (error) {
    res.status(500).json({ error })
  }
})

router.post('/update', async function (req, res) {
  try {
    const updateData = req.body
    const update = await CustomAuthClient.update(updateData)
    const response = { updateSuccessful: update.isSuccessful, message: update.message }
    for (const data of Object.keys(updateData.updateProfileData)) {
      await updateSessionProfileDataByUserId(updateData.sessionUserId, data, updateData.updateProfileData[data])
      if (req.session.passport.user.profileData[data] !== updateData.updateProfileData[data]) {
        req.session.passport.user.profileData[data] = updateData.updateProfileData[data]
        console.log(`[CustomAuth] Updating profile data for user ${updateData.sessionUserId}: ${data} -> ${updateData.updateProfileData[data] || '\'\''}`)
      }
    }
    req.session.save()
    res.status(200).json(response)
  } catch (error) {
    res.status(500).json({ error })
  }
})

module.exports = router

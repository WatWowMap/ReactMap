const router = require('express').Router()
const passport = require('passport')
const { isValidSession, clearOtherSessions } = require('../services/session-store.js')

router.get('/discord', passport.authenticate('discord'))

router.get('/discord/callback',
  passport.authenticate('discord', {
    failureRedirect: '/',
  }),
  async (req, res) => {
    const { id } = req.session.passport.user
    try {
      if (!(await isValidSession(id))) {
        console.debug('[Session] Detected multiple sessions, clearing old ones...')
        await clearOtherSessions(id, req.sessionID)
      }
      res.redirect('/')
    } catch (error) {
      res.status(500).json({ error })
    }
  })

module.exports = router

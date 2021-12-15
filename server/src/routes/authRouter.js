/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
/* eslint-disable no-console */
const fs = require('fs')
const router = require('express').Router()
const passport = require('passport')
const { isValidSession, clearOtherSessions } = require('../services/sessionStore')

// Loads up the base auth routes and any custom ones
fs.readdir(`${__dirname}/../strategies/`, (e, files) => {
  if (e) return console.error(e)
  files.forEach((file) => {
    const trimmed = file.replace('.js', '')

    router.get(`/${trimmed}`, passport.authenticate(trimmed))
    router.get(`/${trimmed}/callback`,
      passport.authenticate(trimmed, {
        failureRedirect: '/',
      }),
      async (req, res) => {
        try {
          const { id } = req.session.passport.user
          if (!(await isValidSession(id))) {
            console.debug('[Session] Detected multiple sessions, clearing old ones...')
            await clearOtherSessions(id, req.sessionID)
          }
          res.redirect('/')
        } catch (err) {
          console.error(err)
          res.redirect('/')
        }
      })
    console.log(`${trimmed} route initialized`)
  })
})

module.exports = router

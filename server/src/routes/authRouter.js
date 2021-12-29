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
    const method = trimmed.includes('local') ? 'post' : 'get'

    router[method](`/${trimmed}`, passport.authenticate(trimmed, {
      successRedirect: '/',
      failureMessage: true,
    }))
    router[method](`/${trimmed}/callback`,
      async (req, res, next) => passport.authenticate(trimmed, async (err, user, info) => {
        if (err) { return next(err) }
        if (!user) {
          res.status(401).json(info.message)
        } else {
          try {
            return req.login(user, async () => {
              const { id } = user
              if (!(await isValidSession(id))) {
                console.debug('[Session] Detected multiple sessions, clearing old ones...')
                await clearOtherSessions(id, req.sessionID)
              }
              return res.redirect('/')
            })
          } catch (error) {
            console.error(error)
            res.redirect('/')
          }
        }
      })(req, res, next))
    console.log(`${method.toUpperCase()} /auth/${trimmed}/callback route initialized`)
  })
})

module.exports = router

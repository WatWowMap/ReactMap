/* eslint-disable no-console */
const router = require('express').Router()
const passport = require('passport')
const {
  isValidSession,
  clearOtherSessions,
} = require('../services/sessionStore')
const {
  authentication: { strategies },
} = require('../services/config')

// Loads up the base auth routes and any custom ones

strategies.forEach((strategy) => {
  const method =
    strategy.type === 'discord' || strategy.type === 'telegram' ? 'get' : 'post'
  if (strategy.enabled) {
    router[method](
      `/${strategy.name}`,
      passport.authenticate(strategy.name, {
        failureRedirect: '/',
        successRedirect: '/',
      }),
    )
    router[method](`/${strategy.name}/callback`, async (req, res, next) =>
      passport.authenticate(strategy.name, async (err, user, info) => {
        if (err) {
          return next(err)
        }
        if (!user) {
          res.status(401).json(info.message)
        } else {
          try {
            return req.login(user, async () => {
              const { id } = user
              if (!(await isValidSession(id))) {
                console.debug(
                  '[Session] Detected multiple sessions, clearing old ones...',
                )
                await clearOtherSessions(id, req.sessionID)
              }
              return res.redirect('/')
            })
          } catch (error) {
            console.error(error)
            res.redirect('/')
          }
        }
      })(req, res, next),
    )
    console.log(
      `[AUTH] ${method.toUpperCase()} /auth/${
        strategy.name
      }/callback route initialized`,
    )
  }
})

router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) console.error('[AUTH] Unable to logout', err)
  })
  req.session.destroy()
  res.redirect('/')
})

module.exports = router

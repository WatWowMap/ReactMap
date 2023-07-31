const router = require('express').Router()
const passport = require('passport')
const {
  authentication: { strategies },
} = require('../services/config')
const { Db } = require('../services/initialization')
const { log, HELPERS } = require('../services/logger')

// Loads up the base auth routes and any custom ones

strategies.forEach((strategy, i) => {
  const method =
    strategy.type === 'discord' || strategy.type === 'telegram' ? 'get' : 'post'
  if (strategy.enabled) {
    const name = strategy.name ?? `${strategy.type}-${i}`
    const authenticateOptions = {
      failureRedirect: '/',
      successRedirect: '/',
    };
    if (strategy.type === 'discord') {
      authenticateOptions.prompt = strategy.clientPrompt;
    }
    router[method](`/${name}`, passport.authenticate(name, authenticateOptions));
    router[method](`/${name}/callback`, async (req, res, next) =>
      passport.authenticate(name, async (err, user, info) => {
        if (err) {
          return next(err)
        }
        if (!user) {
          res.redirect(
            `/blocked/${encodeURIComponent(
              new URLSearchParams(info).toString(),
            )}`,
          )
        } else {
          try {
            return req.login(user, async () => {
              const { id } = user
              if (!(await Db.models.Session.isValidSession(id))) {
                log.info(
                  HELPERS.auth,
                  'Detected multiple sessions, clearing old ones...',
                )
                await Db.models.Session.clearOtherSessions(id, req.sessionID)
              }
              return res.redirect('/')
            })
          } catch (error) {
            log.error(HELPERS.auth, error)
            res.redirect('/')
            next(error)
          }
        }
      })(req, res, next),
    )
    log.info(
      HELPERS.auth,
      `${method.toUpperCase()} /auth/${name}/callback route initialized`,
    )
  }
})

router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) log.error(HELPERS.auth, 'Unable to logout', err)
  })
  // req.session.destroy()
  res.redirect('/')
})

module.exports = router

// @ts-check
const router = require('express').Router()
const passport = require('passport')

const config = require('@rm/config')
const { log, TAGS } = require('@rm/logger')

const state = require('../services/state')

// Loads up the base auth routes and any custom ones

const loadAuthStrategies = () => {
  router.stack = []
  config.getSafe('authentication.strategies').forEach((strategy, i) => {
    const method =
      strategy.type === 'discord' || strategy.type === 'telegram'
        ? 'get'
        : 'post'
    if (strategy.enabled) {
      const name = strategy.name ?? `${strategy.type}-${i}`
      const callbackOptions = {}
      const authenticateOptions = {
        failureRedirect: '/',
        successRedirect: '/',
      }
      if (strategy.type === 'discord') {
        callbackOptions.prompt = strategy.clientPrompt
      }
      router[method](
        `/${name}`,
        passport.authenticate(name, authenticateOptions),
      )
      router[method](`/${name}/callback`, async (req, res, next) =>
        passport.authenticate(
          name,
          callbackOptions,
          async (err, user, info) => {
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
                  if (!(await state.db.models.Session.isValidSession(id))) {
                    log.info(
                      TAGS.auth,
                      'Detected multiple sessions, clearing old ones...',
                    )
                    await state.db.models.Session.clearOtherSessions(
                      id,
                      req.sessionID,
                    )
                  }
                  return res.redirect('/')
                })
              } catch (error) {
                log.error(TAGS.auth, error)
                res.redirect('/')
                next(error)
              }
            }
          },
        )(req, res, next),
      )
      log.info(
        TAGS.auth,
        `${method.toUpperCase()} /auth/${name}/callback route initialized`,
      )
    }
  })

  router.get('/logout', (req, res) => {
    req.logout((err) => {
      if (err) log.error(TAGS.auth, 'Unable to logout', err)
    })
    // req.session.destroy()
    res.redirect('/')
  })

  log.debug(TAGS.auth, 'Auth Router Stack Size:', router.stack.length)
}

loadAuthStrategies()

module.exports = { loadAuthStrategies, authRouter: router }

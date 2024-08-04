// @ts-check
const rateLimit = require('express-rate-limit')

const { log, HELPERS } = require('@rm/logger')
const config = require('@rm/config')

function rateLimitingMiddleware() {
  return rateLimit({
    windowMs: config.getSafe('api.rateLimit.time') * 60 * 1000,
    max: config.getSafe('api.rateLimit.requests'),
    headers: false,
    standardHeaders: false,
    legacyHeaders: false,
    message: {
      status: 429,
      limiter: true,
      type: 'error',
      message: `Too many requests from this IP, please try again in ${config.getSafe(
        'api.rateLimit.time',
      )} minutes.`,
    },
    /**
     *
     * @param {import('express').Request} req
     * @param {import('express').Response} res
     */
    onLimitReached: (req, res) => {
      log.info(
        HELPERS.express,
        req?.user?.username || 'Unknown user',
        'is being rate limited',
      )
      res.sendStatus(429)
    },
  })
}

module.exports = { rateLimitingMiddleware }

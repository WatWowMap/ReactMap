// @ts-check
const { rateLimit } = require('express-rate-limit')

const { log, TAGS } = require('@rm/logger')
const config = require('@rm/config')

function rateLimitingMiddleware() {
  const minutes = config.getSafe('api.rateLimit.time')
  return rateLimit({
    windowMs: minutes * 60 * 1000,
    limit: config.getSafe('api.rateLimit.requests'),

    headers: false,
    legacyHeaders: false,
    message: {
      status: 429,
      limiter: true,
      type: 'error',
      message: `Too many requests from this IP, please try again in ${minutes} minutes.`,
    },
    handler: (req, res, next, options) => {
      log.info(
        TAGS.express,
        req?.user?.username || 'Unknown user',
        'is being rate limited',
      )
      return res.status(options.statusCode).json(options.message)
    },
  })
}

module.exports = { rateLimitingMiddleware }

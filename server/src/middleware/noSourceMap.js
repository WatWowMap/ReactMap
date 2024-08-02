// @ts-check
const { log, HELPERS } = require('@rm/logger')

/** @type {import('@rm/types').ExpressMiddleware} */
function noSourceMapMiddleware(req, res, next) {
  if (req.url.endsWith('.map')) {
    log.warn(
      HELPERS.express,
      req.url,
      'Forbidden: Source map requested from',
      req.user?.username,
    )
    res.status(403).send('Naughty!')
  } else {
    next()
  }
}

module.exports = { noSourceMapMiddleware }

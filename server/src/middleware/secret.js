// @ts-check
const config = require('@rm/config')
const { log, HELPERS } = require('@rm/logger')

/** @type {import('@rm/types').ExpressMiddleware} */
function secretMiddleware(req, res, next) {
  const reactMapSecret = config.getSafe('api.reactMapSecret')
  const secret = req.headers['react-map-secret'] ?? req.headers['x-react-map']

  if (!secret) {
    log.error(
      HELPERS.api,
      req.originalUrl,
      'Forbidden: secret header is missing',
    )
    return res
      .status(403)
      .json({ message: 'Forbidden: x-react-map header is missing' })
  }

  if (secret !== reactMapSecret) {
    log.error(HELPERS.api, req.originalUrl, 'Forbidden: Invalid secret key')
    return res.status(403).json({ message: 'Forbidden: Invalid secret key' })
  }

  log.info(
    HELPERS.api,
    HELPERS.url(req.originalUrl),
    req.user?.username || 'Unknown User',
    req.headers['x-forwarded-for'] ? `| ${req.headers['x-forwarded-for']}` : '',
  )
  next()
}

module.exports = { secretMiddleware }

// @ts-check
const config = require('@rm/config')
const { log, HELPERS } = require('@rm/logger')

/**
 * Middleware to check for the x-react-map header.
 *
 * @param {import('express').Request} req - The request object.
 * @param {import('express').Response} res - The response object.
 * @param {import('express').NextFunction} next - The next middleware function.
 */
function secretMiddleware(req, res, next) {
  const reactMapSecret = config.getSafe('api.reactMapSecret')
  const secret = req.headers['react-map-secret'] ?? req.headers['x-react-map']

  if (!secret) {
    log.error(HELPERS.api, req.url, 'Forbidden: secret header is missing')
    return res
      .status(403)
      .json({ message: 'Forbidden: x-react-map header is missing' })
  }

  if (secret !== reactMapSecret) {
    log.error(HELPERS.api, req.url, 'Forbidden: Invalid secret key')
    return res.status(403).json({ message: 'Forbidden: Invalid secret key' })
  }

  next() // Proceed to the next middleware or route handler
}

module.exports = { secretMiddleware }

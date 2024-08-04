// @ts-check
/* eslint-disable prefer-rest-params */
const bytes = require('bytes')

const { log, HELPERS } = require('@rm/logger')

/** @type {import('@rm/types').ExpressMiddleware} */
function loggerMiddleware(req, res, next) {
  const start = process.hrtime()

  const oldWrite = res.write
  const oldEnd = res.end
  let resBodySize = 0

  // @ts-ignore
  res.write = function write(chunk) {
    resBodySize += chunk.length
    oldWrite.apply(res, arguments)
  }

  // @ts-ignore
  res.end = function end(chunk) {
    if (chunk) {
      resBodySize += chunk.length
    }
    oldEnd.apply(res, arguments)
  }

  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(start)
    const responseTime = (seconds * 1000 + nanoseconds / 1e6).toFixed(3) // in milliseconds
    log.debug(
      HELPERS.express,
      req.method,
      HELPERS.url(req.originalUrl),
      HELPERS.statusCode(res.statusCode),
      `${responseTime}ms`,
      '|',
      HELPERS.download(bytes(req.bodySize || 0)),
      HELPERS.upload(bytes(resBodySize || 0)),
      '|',
      req.user ? req.user.username : 'Not Logged In',
      req.headers['x-forwarded-for']
        ? `| ${req.headers['x-forwarded-for']}`
        : '',
    )
  })
  next()
}

module.exports = { loggerMiddleware }

// @ts-check
const bytes = require('bytes')

const { log, TAGS } = require('@rm/logger')

/** @type {import('@rm/types').ExpressMiddleware} */
function loggerMiddleware(req, res, next) {
  const start = process.hrtime()

  const oldWrite = res.write
  const oldEnd = res.end
  let resBodySize = 0

  // @ts-expect-error
  res.write = function write(chunk) {
    resBodySize += chunk.length
    // biome-ignore lint/complexity/noArguments: forwards the caller's exact arity to the original res.write
    oldWrite.apply(res, arguments)
  }

  // @ts-expect-error
  res.end = function end(chunk) {
    if (chunk) {
      resBodySize += chunk.length
    }
    // biome-ignore lint/complexity/noArguments: forwards the caller's exact arity to the original res.end
    oldEnd.apply(res, arguments)
  }

  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(start)
    const responseTime = (seconds * 1000 + nanoseconds / 1e6).toFixed(3) // in milliseconds
    log.debug(
      TAGS.express,
      TAGS.method(req.method),
      TAGS.url(req.originalUrl.split('?', 1)[0]),
      TAGS.statusCode(res.statusCode),
      `${responseTime}ms`,
      '|',
      TAGS.download(bytes(req.bodySize || 0)),
      TAGS.upload(bytes(resBodySize || 0)),
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

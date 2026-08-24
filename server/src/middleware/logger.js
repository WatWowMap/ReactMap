// @ts-check
const bytes = require('bytes')

const { log, TAGS } = require('@rm/logger')

/** @type {import('@rm/types').ExpressMiddleware} */
function loggerMiddleware(req, res, next) {
  const start = process.hrtime()

  const oldWrite = res.write
  const oldEnd = res.end
  let resBodySize = 0

  res.write = function write(chunk) {
    resBodySize += chunk?.length || 0
    // The return value is the backpressure signal: false means the internal
    // buffer is full and the writer should wait for 'drain'. Dropping it
    // returns undefined, which any streaming writer reads as "full", and it
    // then waits for a drain that never comes. Express's own res.send ignores
    // this, which is why every ordinary route worked while Better Auth's
    // handler, which pipes a Web ReadableStream, hung until the client gave up.
    // biome-ignore lint/complexity/noArguments: forwards the caller's exact arity to the original res.write
    return oldWrite.apply(res, arguments)
  }

  res.end = function end(chunk) {
    if (chunk) {
      resBodySize += chunk.length
    }
    // Returns `res` for chaining; dropping it breaks callers that chain.
    // biome-ignore lint/complexity/noArguments: forwards the caller's exact arity to the original res.end
    return oldEnd.apply(res, arguments)
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

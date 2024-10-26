const { default: helmet } = require('helmet')

function helmetMiddleware() {
  return helmet({
    hidePoweredBy: true,
    contentSecurityPolicy: {
      directives: {
        scriptSrc: [
          "'self'",
          'https://cdn.jsdelivr.net',
          'https://telegram.org',
          'https://static.cloudflareinsights.com',
        ],
        frameSrc: ["'self'", 'https://*.telegram.org'],
        workerSrc: ["'self'", 'blob:'],
      },
    },
  })
}

module.exports = { helmetMiddleware }

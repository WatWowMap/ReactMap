// @ts-check
const chalk = require('chalk')

const TAGS = /** @type {const} */ ({
  trace: chalk.gray('☰'),
  debug: chalk.green('☯'),
  info: chalk.blue('ℹ'),
  warn: chalk.yellow('⚠'),
  error: chalk.red('✖'),

  cache: chalk.blueBright('[CACHE]'),
  gql: chalk.hex('#3F20BA')('[GQL]'),
  express: chalk.hex('#FFA500')('[EXPRESS]'),
  locales: chalk.cyan('[LOCALES]'),
  masterfile: chalk.magenta('[MASTERFILE]'),
  i18n: chalk.cyanBright('[I18N]'),
  init: chalk.hex('#800080')('[INIT]'),
  session: chalk.hex('#FF69B4')('[SESSION]'),
  auth: chalk.hex('#ad3978')('[AUTH]'),
  api: chalk.hex('#fe7c73')('[API]'),
  client: chalk.hex('#90caf9')('[CLIENT]'),
  config: chalk.hex('#f48fb1')('[CONFIG]'),
  areas: chalk.hex('#9ccc65')('[AREAS]'),
  update: chalk.hex('#795548')('[UPDATE]'),
  db: chalk.hex('#aa00ff')('[DB]'),
  knex: chalk.hex('#ff00ff')('[KNEX]'),
  event: chalk.hex('#283593')('[EVENT]'),
  webhooks: chalk.hex('#1de9b6')('[WEBHOOKS]'),
  geocoder: chalk.hex('#ff5722')('[GEOCODER]'),
  fetch: chalk.hex('#880e4f')('[FETCH]'),
  scanner: chalk.hex('#b39ddb')('[SCANNER]'),
  build: chalk.hex('#ef6c00')('[BUILD]'),
  ReactMap: chalk.hex('#ff3d00')('[ReactMap]'),
  trial: chalk.hex('#fff320')('[TRIAL]'),
  start: chalk.greenBright('[START]'),
  end: chalk.redBright('[END]'),

  pokemon: chalk.hex('#f44336')('[POKEMON]'),
  pokestops: chalk.hex('#e91e63')('[POKESTOPS]'),
  gyms: chalk.hex('#9c27b0')('[GYMS]'),
  weather: chalk.hex('#3f51b5')('[WEATHER]'),
  available: chalk.hex('#2196f3')('[AVAILABLE]'),
  scanAreas: chalk.hex('#00bcd4')('[SCAN AREAS]'),
  scanAreasMenu: chalk.hex('#009688')('[SCAN AREAS MENU]'),
  submissionCells: chalk.hex('#4caf50')('[SUBMISSION CELLS]'),
  spawnpoints: chalk.hex('#8bc34a')('[SPAWNPOINTS]'),
  scanCells: chalk.hex('#ffeb3b')('[SCAN CELLS]'),
  s2cells: chalk.hex('#ffc107')('[S2 CELLS]'),
  devices: chalk.hex('#ff9800')('[DEVICE]'),
  nests: chalk.hex('#ff5724')('[NESTS]'),
  portals: chalk.hex('#795548')('[PORTALS]'),
  route: chalk.hex('#607d8b')('[ROUTE]'),
  routes: chalk.hex('#9e9e9e')('[ROUTES]'),
  search: chalk.hex('#795548')('[SEARCH]'),
  stats: chalk.hex('#456l2a')('[STATS]'),

  telegram: (label = '[TELEGRAM]') => chalk.hex('#26A8EA')(label),
  discord: (label = '[DISCORD]') => chalk.hex('#7289da')(label),
  local: (label = '[LOCAL]') => chalk.hex('#FFA500')(label),

  upload: (size = '0B') => chalk.greenBright(`↑ ${size}`),
  download: (size = '0B') => chalk.redBright(`↓ ${size}`),
  url: (url = '') => chalk.hex('#00d7ac')(`[${url.toUpperCase()}]`),
  statusCode: (code = 200) => {
    if (code >= 500) {
      return chalk.red(code)
    }
    if (code >= 400) {
      return chalk.yellow(code)
    }
    if (code >= 300) {
      return chalk.cyan(code)
    }

    return chalk.green(code)
  },
  method: (method = 'GET') => {
    const tag = `[${method}]`

    if (method === 'GET') {
      return chalk.green(tag)
    }
    if (method === 'POST') {
      return chalk.blue(tag)
    }
    if (method === 'PUT') {
      return chalk.yellow(tag)
    }
    if (method === 'DELETE') {
      return chalk.red(tag)
    }

    return chalk.hex('#00d7ac')(tag)
  },
  custom: (text = '', color = '#64b5f6') =>
    chalk.hex(color)(`[${text.toUpperCase()}]`),
})

module.exports.TAGS = TAGS

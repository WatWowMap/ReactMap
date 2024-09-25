// @ts-check

const express = require('express')
const fs = require('fs')
const { join } = require('path')
const { SourceMapConsumer } = require('source-map')

const config = require('@rm/config')
const { log, TAGS } = require('@rm/logger')

const { authRouter } = require('./authRouter')
const { clientRouter } = require('./clientRouter')
const { apiRouter } = require('./api')
const { areaPerms } = require('../utils/areaPerms')
const { getServerSettings } = require('../utils/getServerSettings')
const { secretMiddleware } = require('../middleware/secret')
const { version } = require('../../../package.json')
const { state } = require('../services/state')

const rootRouter = express.Router()

rootRouter.use('/', clientRouter)

rootRouter.use('/auth', authRouter)

rootRouter.use('/api/v1', secretMiddleware, apiRouter)

rootRouter.get('/api/health', async (req, res) =>
  res.status(200).json({ status: 'ok' }),
)

rootRouter.post('/api/error/client', async (req, res) => {
  try {
    const { stack, cause, message, uuid } = req.body

    const username =
      req?.user?.username ||
      req?.user?.discordId ||
      req?.user?.telegramId ||
      req?.user?.id ||
      'Not Logged In'

    const originalStack =
      typeof stack === 'string'
        ? await Promise.all(
            stack.split('\n').map(async (stackLine, i) => {
              const match = stackLine.match(
                /at (.+) \((\/.+\.js):(\d+):(\d+)\)/,
              )
              log.debug(TAGS.client, { match, stackLine })
              if (match) {
                const [full, functionName, file, line, column] = match
                const foundStack = await SourceMapConsumer.with(
                  await fs.promises.readFile(
                    join(__dirname, '../../../dist', `${file}.map`),
                    'utf8',
                  ),
                  null,
                  (consumer) => {
                    if (!consumer) return null
                    const position = consumer.originalPositionFor({
                      line: Number(line),
                      column: Number(column),
                    })

                    if (position.source && position.line && position.column) {
                      return `${functionName} (${position.source}:${position.line}:${position.column})`
                    }
                  },
                )
                if (foundStack) {
                  return foundStack
                }
                log.warn(TAGS.client, 'Unable to find source map', {
                  full,
                  functionName,
                  file,
                  line,
                  column,
                })
              }
              if (i > 0) {
                log.warn(TAGS.client, 'Regex missed for stack line:', stackLine)
              }
              return stackLine
            }),
          ).then((lines) => lines.join('\n'))
        : cause || message

    log.error(TAGS.client, {
      client_version: req.headers.version,
      server_version: version,
      username,
      client_id: uuid,
      nginx_id: req.headers['x-request-id'],
      trace: originalStack,
    })
    res.status(200).send('Error reported')
  } catch (mapErr) {
    log.error('Error processing source map:', mapErr)
    res.status(500).send('Failed to process error')
  }
})

rootRouter.get('/area/:area/:zoom?', (req, res) => {
  const { area, zoom } = req.params
  try {
    const validScanAreas = config.getSafe('areas.scanAreas')
    if (validScanAreas.features.length) {
      const foundArea = validScanAreas.features.find(
        (a) => a.properties.name.toLowerCase() === area.toLowerCase(),
      )
      if (foundArea) {
        const [lat, lon] = foundArea.properties.center
        return res.redirect(`/@/${lat}/${lon}/${zoom || 18}`)
      }
      return res.redirect('/404')
    }
  } catch (e) {
    log.error(TAGS.express, `Error navigating to ${area}`, e)
    res.redirect('/404')
  }
})

rootRouter.get('/api/settings', async (req, res, next) => {
  const authentication = config.getSafe('authentication')
  const scanner = config.getSafe('scanner')
  const api = config.getSafe('api')
  const mapConfig = config.getSafe('map')

  try {
    if (
      authentication.alwaysEnabledPerms.length ||
      !authentication.methods.length
    ) {
      if (req.session.tutorial === undefined) {
        req.session.tutorial = !mapConfig.misc.forceTutorial
      }
      req.session.perms = {
        ...Object.fromEntries(
          Object.keys(authentication.perms).map((p) => [p, false]),
        ),
        areaRestrictions: areaPerms(['none']),
        webhooks: [],
        scanner: Object.keys(scanner).filter(
          (key) =>
            key !== 'backendConfig' &&
            scanner[key].enabled &&
            !scanner[key].discordRoles.length &&
            !scanner[key].telegramGroups.length,
        ),
      }
      authentication.alwaysEnabledPerms.forEach((perm) => {
        if (authentication.perms[perm]) {
          req.session.perms[perm] = true
        } else {
          log.warn(
            TAGS.auth,
            'Invalid Perm in "alwaysEnabledPerms" array:',
            perm,
          )
        }
      })
    } else if (!req.session.perms) {
      req.session.perms = {}
    }
    req.session.save()

    if (authentication.methods.length && req.user) {
      try {
        const user = await state.db.query('User', 'getOne', req.user.id)
        if (user) {
          if (!user.selectedWebhook) {
            const newWebhook = req.user.perms.webhooks.find(
              (n) => n in state.event.webhookObj,
            )
            await state.db.query('User', 'updateWebhook', user.id, newWebhook)
            if (req.session?.user) {
              req.session.user.selectedWebhook = newWebhook
              req.session.save()
            }
          }
        }
      } catch (e) {
        log.warn(TAGS.session, 'Issue finding user, User ID:', req?.user?.id, e)
      }
    }
    const settings = getServerSettings(req)

    if ('perms' in settings.user) {
      if (settings.user.perms.pokemon && api.queryOnSessionInit.pokemon) {
        state.event.setAvailable('pokemon', 'Pokemon', state.db)
      }
      if (
        api.queryOnSessionInit.raids &&
        (settings.user.perms.raids || settings.user.perms.gyms)
      ) {
        state.event.setAvailable('gyms', 'Gym', state.db)
      }
      if (
        api.queryOnSessionInit.quests &&
        (settings.user.perms.quests ||
          settings.user.perms.pokestops ||
          settings.user.perms.invasions ||
          settings.user.perms.lures)
      ) {
        state.event.setAvailable('pokestops', 'Pokestop', state.db)
      }
      if (settings.user.perms.nests && api.queryOnSessionInit.nests) {
        state.event.setAvailable('nests', 'Nest', state.db)
      }
      if (settings.user.perms.stations && api.queryOnSessionInit.stations) {
        state.event.setAvailable('stations', 'Station', state.db)
      }
    }

    res.status(200).json(settings)
  } catch (error) {
    res.status(500).json({ error: error.message, status: 500 })
    next(error)
  }
})

module.exports = { rootRouter }

const express = require('express')
const fs = require('fs')
const { resolve } = require('path')
const { SourceMapConsumer } = require('source-map')
const config = require('@rm/config')
const { log, HELPERS } = require('@rm/logger')
const authRouter = require('./authRouter')
const clientRouter = require('./clientRouter')
const { Event, Db } = require('../services/initialization')
const { version } = require('../../../package.json')
const areaPerms = require('../services/functions/areaPerms')
const getServerSettings = require('../services/functions/getServerSettings')

const rootRouter = express.Router()

rootRouter.use('/', clientRouter)

rootRouter.use('/auth', authRouter)

fs.readdir(resolve(__dirname, './api/v1/'), (e, files) => {
  if (e) return log.error(HELPERS.api, 'Error initializing an API endpoint', e)
  files.forEach((file) => {
    try {
      rootRouter.use(
        `/api/v1/${file.replace('.js', '')}`,
        require(resolve(__dirname, './api/v1/', file)),
      )
      log.info(HELPERS.api, `Loaded ${file}`)
    } catch (err) {
      log.warn(HELPERS.api, 'Unable to load API endpoint:', file, '\n', err)
    }
  })
})

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
            stack.split('\n').map(async (stackLine) => {
              const match = stackLine.match(
                /at (.+) \(https?:\/\/([^/]+)\/(.+\.js):(\d+):(\d+)\)/,
              )
              if (match) {
                const [, functionName, , file, line, column] = match
                const foundStack = await SourceMapConsumer.with(
                  await fs.promises.readFile(
                    resolve(__dirname, '../../../dist', `${file}.map`),
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
              }
              return stackLine
            }),
          ).then((lines) => lines.join('\n'))
        : cause || message

    log.error(HELPERS.client, {
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
    const { scanAreas } = config.areas
    const validScanAreas = scanAreas[req.headers.host.replaceAll('.', '_')]
      ? scanAreas[req.headers.host.replaceAll('.', '_')]
      : scanAreas.main
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
    log.error(HELPERS.express, `Error navigating to ${area}`, e)
    res.redirect('/404')
  }
})

rootRouter.get('/api/settings', async (req, res, next) => {
  try {
    if (
      config.authentication.alwaysEnabledPerms.length ||
      !config.authentication.methods.length
    ) {
      if (req.session.tutorial === undefined) {
        req.session.tutorial = !config.map.forceTutorial
      }
      req.session.perms = {
        ...Object.fromEntries(
          Object.keys(config.authentication.perms).map((p) => [p, false]),
        ),
        areaRestrictions: areaPerms(['none']),
        webhooks: [],
        scanner: Object.keys(config.scanner).filter(
          (key) =>
            key !== 'backendConfig' &&
            config.scanner[key].enabled &&
            !config.scanner[key].discordRoles.length &&
            !config.scanner[key].telegramGroups.length,
        ),
      }
      config.authentication.alwaysEnabledPerms.forEach((perm) => {
        if (config.authentication.perms[perm]) {
          req.session.perms[perm] = true
        } else {
          log.warn(
            HELPERS.auth,
            'Invalid Perm in "alwaysEnabledPerms" array:',
            perm,
          )
        }
      })
    } else if (!req.session.perms) {
      req.session.perms = {}
    }
    req.session.save()

    if (config.authentication.methods.length && req.user) {
      try {
        const user = await Db.query('User', 'getOne', req.user.id)
        if (user) {
          if (!user.selectedWebhook) {
            const newWebhook = req.user.perms.webhooks.find(
              (n) => n in Event.webhookObj,
            )
            await Db.query('User', 'updateWebhook', user.id, newWebhook)
            if (req.session?.user) {
              req.session.user.selectedWebhook = newWebhook
              req.session.save()
            }
          }
        }
      } catch (e) {
        log.warn(
          HELPERS.session,
          'Issue finding user, User ID:',
          req?.user?.id,
          e,
        )
      }
    }
    const settings = getServerSettings(req)

    if ('perms' in settings.user) {
      if (
        settings.user.perms.pokemon &&
        config.api.queryOnSessionInit.pokemon
      ) {
        Event.setAvailable('pokemon', 'Pokemon', Db, false)
      }
      if (
        config.api.queryOnSessionInit.raids &&
        (settings.user.perms.raids || settings.user.perms.gyms)
      ) {
        Event.setAvailable('gyms', 'Gym', Db, false)
      }
      if (
        config.api.queryOnSessionInit.quests &&
        (settings.user.perms.quests ||
          settings.user.perms.pokestops ||
          settings.user.perms.invasions ||
          settings.user.perms.lures)
      ) {
        Event.setAvailable('pokestops', 'Pokestop', Db, false)
      }
      if (settings.user.perms.nests && config.api.queryOnSessionInit.nests) {
        Event.setAvailable('nests', 'Nest', Db, false)
      }
      if (Object.values(config.api.queryOnSessionInit).some(Boolean)) {
        Event.addAvailable()
      }
    }

    res.status(200).json(settings)
  } catch (error) {
    res.status(500).json({ error: error.message, status: 500 })
    next(error)
  }
})

module.exports = rootRouter

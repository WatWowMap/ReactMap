/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
// @ts-check
const router = require('express').Router()
const config = require('config')
const { log, HELPERS } = require('@rm/logger')
const { Db } = require('../../../services/initialization')

const api = config.getSafe('api')

router.get('/', async (req, res) => {
  try {
    if (
      api.reactMapSecret &&
      req.headers['react-map-secret'] === api.reactMapSecret
    ) {
      res.status(200).json(await Db.models.User.query())
    } else {
      throw new Error('Incorrect or missing API secret')
    }
    log.info(HELPERS.api, 'api/v1/users')
  } catch (e) {
    log.error(HELPERS.api, 'api/v1/sessions', e)
    res.status(500).json({ status: 'error', reason: e.message })
  }
})

router.get('/export', async (req, res) => {
  try {
    if (
      api.reactMapSecret &&
      req.headers['react-map-secret'] === api.reactMapSecret
    ) {
      /** @type {import('@packages/types/models').FullUser[]} */
      const users = await Db.models.User.query()

      const badges = {}

      /** @type {import('@packages/types/models').FullGymBadge[]} */
      const rawBadges = await Db.models.Badge.query()
      // eslint-disable-next-line no-unused-vars
      rawBadges.forEach(({ userId, id, ...rest }) => {
        if (!badges[userId]) {
          badges[userId] = []
        }
        badges[userId].push(rest)
      })

      const backups = {}
      /** @type {import('@packages/types/models').FullBackup[]} */
      const rawBackups = await Db.models.Backup.query()

      // eslint-disable-next-line no-unused-vars
      rawBackups.forEach(({ userId, id, ...rest }) => {
        if (!backups[userId]) {
          backups[userId] = []
        }
        backups[userId].push(rest)
      })

      const data = users.map(({ id, ...rest }) => ({
        ...rest,
        badges: badges[id] || [],
        backups: backups[id] || [],
      }))
      res.status(200).json(data)
    } else {
      throw new Error('Incorrect or missing API secret')
    }
    log.info(HELPERS.api, 'api/v1/users')
  } catch (e) {
    log.error(HELPERS.api, 'api/v1/users/export', e)
    res.status(500).json({ status: 'error', reason: e.message })
  }
})

router.post('/import', async (req, res) => {
  try {
    if (
      api.reactMapSecret &&
      req.headers['react-map-secret'] === api.reactMapSecret
    ) {
      const { body } = req
      const bodyArray = Array.isArray(body) ? body : [body]

      /**
       * @param {import('@packages/types/models').User} user
       * @returns {Promise<import('@packages/types/models').FullUser>}
       */
      const getUser = async (user) => {
        if (user.username) {
          const found = await Db.models.User.query().select().findOne({
            username: user.username,
          })
          if (found) return found
        }
        if (user.discordId) {
          const found = await Db.models.User.query().select().findOne({
            discordId: user.discordId,
          })
          if (found) return found
        }
        if (user.telegramId) {
          const found = await Db.models.User.query().select().findOne({
            telegramId: user.telegramId,
          })
          if (found) return found
        }
        return Db.models.User.query().insert(user)
      }

      for (const { backups, badges, ...user } of bodyArray) {
        const userEntry = await getUser(user)

        log.info(
          HELPERS.api,
          'Inserted User',
          userEntry.id,
          userEntry.username || userEntry.discordId || userEntry.telegramId,
        )

        if (badges) {
          for (const badge of badges) {
            await Db.models.Badge.query().insert({
              ...badge,
              userId: userEntry.id,
            })
          }
        }
        if (backups) {
          for (const backup of backups) {
            await Db.models.Backup.query().insert({
              ...backup,
              userId: userEntry.id,
            })
          }
        }
      }
      res.status(200).json({ status: 'success' })
    } else {
      throw new Error('Incorrect or missing API secret')
    }
    log.info(HELPERS.api, 'api/v1/users/import')
  } catch (e) {
    log.error(HELPERS.api, 'api/v1/users/import', e)
    res.status(500).json({ status: 'error', reason: e.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    if (
      api.reactMapSecret &&
      req.headers['react-map-secret'] === api.reactMapSecret
    ) {
      const user = await Db.models.User.query().findById(req.params.id)
      res
        .status(200)
        .json(user || { status: 'error', reason: 'User Not Found' })
    } else {
      throw new Error('Incorrect or missing API secret')
    }
    log.info(HELPERS.api, `api/v1/users/${req.params.id}`)
  } catch (e) {
    log.error(HELPERS.api, `api/v1/users/${req.params.id}`, e)
    res.status(500).json({ status: 'error', reason: e.message })
  }
})

router.get('/discord/:id', async (req, res) => {
  try {
    if (
      api.reactMapSecret &&
      req.headers['react-map-secret'] === api.reactMapSecret
    ) {
      const user = await Db.models.User.query()
        .where('discordId', req.params.id)
        .first()
      res
        .status(200)
        .json(user || { status: 'error', reason: 'User Not Found' })
    } else {
      throw new Error('Incorrect or missing API secret')
    }
    log.info(HELPERS.api, `api/v1/users/discord/${req.params.id}`)
  } catch (e) {
    log.error(HELPERS.api, `api/v1/users/discord/${req.params.id}`, e)
    res.status(500).json({ status: 'error', reason: e.message })
  }
})

router.get('/telegram/:id', async (req, res) => {
  try {
    if (
      api.reactMapSecret &&
      req.headers['react-map-secret'] === api.reactMapSecret
    ) {
      const user = await Db.models.User.query()
        .where('telegramId', req.params.id)
        .first()
      res
        .status(200)
        .json(user || { status: 'error', reason: 'User Not Found' })
    } else {
      throw new Error('Incorrect or missing API secret')
    }
    log.info(HELPERS.api, `api/v1/users/telegram/${req.params.id}`)
  } catch (e) {
    log.error(HELPERS.api, `api/v1/users/telegram/${req.params.id}`, e)
    res.status(500).json({ status: 'error', reason: e.message })
  }
})

module.exports = router

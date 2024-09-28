// @ts-check
const router = require('express').Router()
const { log, TAGS } = require('@rm/logger')

const { state } = require('../../../services/state')

router.get('/', async (req, res) => {
  try {
    res.status(200).json(await state.db.models.User.query())
    log.info(TAGS.api, 'api/v1/users')
  } catch (e) {
    log.error(TAGS.api, 'api/v1/sessions', e)
    res.status(500).json({ status: 'error', reason: e.message })
  }
})

router.get('/export', async (req, res) => {
  try {
    /** @type {import('@rm/types').FullUser[]} */
    const users = await state.db.models.User.query()

    const badges = {}

    /** @type {import('@rm/types').FullGymBadge[]} */
    const rawBadges = await state.db.models.Badge.query()

    rawBadges.forEach(({ userId, id: _id, ...rest }) => {
      if (!badges[userId]) {
        badges[userId] = []
      }
      badges[userId].push(rest)
    })

    const backups = {}
    /** @type {import('@rm/types').FullBackup[]} */
    const rawBackups = await state.db.models.Backup.query()

    rawBackups.forEach(({ userId, id: _id, ...rest }) => {
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
    log.info(TAGS.api, 'api/v1/users')
  } catch (e) {
    log.error(TAGS.api, 'api/v1/users/export', e)
    res.status(500).json({ status: 'error', reason: e.message })
  }
})

router.post('/import', async (req, res) => {
  try {
    const { body } = req
    const bodyArray = Array.isArray(body) ? body : [body]

    /**
     * @param {import('@rm/types').User} user
     * @returns {Promise<import('@rm/types').FullUser>}
     */
    const getUser = async (user) => {
      if (user.username) {
        const found = await state.db.models.User.query().select().findOne({
          username: user.username,
        })

        if (found) return found
      }
      if (user.discordId) {
        const found = await state.db.models.User.query().select().findOne({
          discordId: user.discordId,
        })

        if (found) return found
      }
      if (user.telegramId) {
        const found = await state.db.models.User.query().select().findOne({
          telegramId: user.telegramId,
        })

        if (found) return found
      }

      return state.db.models.User.query().insert(user)
    }

    for (const { backups, badges, ...user } of bodyArray) {
      const userEntry = await getUser(user)

      log.info(
        TAGS.api,
        'Inserted User',
        userEntry.id,
        userEntry.username || userEntry.discordId || userEntry.telegramId,
      )

      if (badges) {
        for (const badge of badges) {
          await state.db.models.Badge.query().insert({
            ...badge,
            userId: userEntry.id,
          })
        }
      }
      if (backups) {
        for (const backup of backups) {
          await state.db.models.Backup.query().insert({
            ...backup,
            userId: userEntry.id,
          })
        }
      }
    }
    res.status(200).json({ status: 'success' })
    log.info(TAGS.api, 'api/v1/users/import')
  } catch (e) {
    log.error(TAGS.api, 'api/v1/users/import', e)
    res.status(500).json({ status: 'error', reason: e.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const user = await state.db.models.User.query().findById(req.params.id)

    res.status(200).json(user || { status: 'error', reason: 'User Not Found' })
    log.info(TAGS.api, `api/v1/users/${req.params.id}`)
  } catch (e) {
    log.error(TAGS.api, `api/v1/users/${req.params.id}`, e)
    res.status(500).json({ status: 'error', reason: e.message })
  }
})

router.get('/discord/:id', async (req, res) => {
  try {
    const user = await state.db.models.User.query()
      .where('discordId', req.params.id)
      .first()

    res.status(200).json(user || { status: 'error', reason: 'User Not Found' })
    log.info(TAGS.api, `api/v1/users/discord/${req.params.id}`)
  } catch (e) {
    log.error(TAGS.api, `api/v1/users/discord/${req.params.id}`, e)
    res.status(500).json({ status: 'error', reason: e.message })
  }
})

router.get('/telegram/:id', async (req, res) => {
  try {
    const user = await state.db.models.User.query()
      .where('telegramId', req.params.id)
      .first()

    res.status(200).json(user || { status: 'error', reason: 'User Not Found' })
    log.info(TAGS.api, `api/v1/users/telegram/${req.params.id}`)
  } catch (e) {
    log.error(TAGS.api, `api/v1/users/telegram/${req.params.id}`, e)
    res.status(500).json({ status: 'error', reason: e.message })
  }
})

module.exports = router

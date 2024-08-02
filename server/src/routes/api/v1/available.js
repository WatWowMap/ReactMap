// @ts-check
const router = require('express').Router()

const { log, HELPERS } = require('@rm/logger')
const state = require('../../../services/state')

const queryObj = /** @type {const} */ ({
  pokemon: { model: 'Pokemon', category: 'pokemon' },
  quests: { model: 'Pokestop', category: 'pokestops' },
  raids: { model: 'Gym', category: 'gyms' },
  nests: { model: 'Nest', category: 'nests' },
})

/** @param {string} category */
const resolveCategory = (category) => {
  switch (category) {
    case 'gym':
    case 'gyms':
    case 'raid':
    case 'raids':
      return 'raids'
    case 'pokestop':
    case 'pokestops':
    case 'quest':
    case 'quests':
      return 'quests'
    case 'pokemon':
    case 'pokemons':
      return 'pokemon'
    default:
      return 'all'
  }
}

/** @param {boolean} compare */
const getAll = async (compare) => {
  const available = compare
    ? await Promise.all([
        state.db.getAvailable('Pokemon'),
        state.db.getAvailable('Pokestop'),
        state.db.getAvailable('Gym'),
        state.db.getAvailable('Nest'),
      ])
    : [
        state.event.available.pokemon,
        state.event.available.pokestops,
        state.event.available.gyms,
        state.event.available.nests,
      ]
  return Object.fromEntries(
    Object.keys(queryObj).map((key, i) => [key, available[i]]),
  )
}

router.get(['/', '/:category'], async (req, res) => {
  try {
    const { model, category } =
      queryObj[resolveCategory(req.params.category)] || {}
    const { current, equal } = req.query

    if (model && category) {
      const available =
        current !== undefined
          ? await state.db.getAvailable(model)
          : state.event.available[category]
      available.sort((a, b) => a.localeCompare(b))

      if (equal !== undefined) {
        const compare =
          current !== undefined
            ? state.event.available[category]
            : await state.db.getAvailable(model)
        compare.sort((a, b) => a.localeCompare(b))
        res.status(200).json(available.every((item, i) => item === compare[i]))
      } else {
        res.status(200).json(available)
      }
    } else {
      const available = await getAll(!!current)
      Object.values(available).forEach((c) =>
        c.sort((a, b) => a.localeCompare(b)),
      )

      if (equal !== undefined) {
        const compare = await getAll(!current)
        Object.values(compare).forEach((c) =>
          c.sort((a, b) => a.localeCompare(b)),
        )

        res
          .status(200)
          .json(
            Object.keys(available).every((cat) =>
              available[cat].every((item, j) => item === compare[cat][j]),
            ),
          )
      } else {
        res.status(200).json(available)
      }
    }
  } catch (e) {
    log.error(HELPERS.api, req.originalUrl, e)
    res.status(500).json({ status: 'ServerError', reason: e.message })
  }
})

router.put('/:category', async (req, res) => {
  try {
    const { model, category } =
      queryObj[resolveCategory(req.params.category)] || {}

    if (model && category) {
      await state.event.setAvailable(category, model, state.db)
    } else {
      await Promise.all([
        state.event.setAvailable('pokemon', 'Pokemon', state.db),
        state.event.setAvailable('pokestops', 'Pokestop', state.db),
        state.event.setAvailable('gyms', 'Gym', state.db),
        state.event.setAvailable('nests', 'Nest', state.db),
      ])
    }
    res
      .status(200)
      .json({ status: `updated available for ${category || 'all'}` })
  } catch (e) {
    log.error(HELPERS.api, req.originalUrl, e)
    res.status(500).json({ status: 'ServerError', reason: e.message })
  }
})

module.exports = router

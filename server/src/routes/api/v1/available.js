/* eslint-disable no-console */
const path = require('path')
const router = require('express').Router()
const { api } = require('../../../services/config')
const { Db, Event } = require('../../../services/initialization')

const queryObj = {
  pokemon: { model: 'Pokemon', category: 'pokemon' },
  quests: { model: 'Pokestop', category: 'pokestops' },
  raids: { model: 'Gym', category: 'gyms' },
  nests: { model: 'Nest', category: 'nests' },
}

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

const getAll = async (compare) => {
  const available = compare
    ? await Promise.all([
        Db.getAvailable('Pokemon'),
        Db.getAvailable('Pokestop'),
        Db.getAvailable('Gym'),
        Db.getAvailable('Nest'),
      ])
    : [
        Event.available.pokemon,
        Event.available.pokestops,
        Event.available.gyms,
        Event.available.nests,
      ]
  return Object.fromEntries(
    Object.keys(queryObj).map((key, i) => [key, available[i]]),
  )
}

router.get(['/', '/:category'], async (req, res) => {
  const { model, category } =
    queryObj[resolveCategory(req.params.category)] || {}
  const { current, equal } = req.query
  try {
    if (
      api.reactMapSecret &&
      req.headers['react-map-secret'] === api.reactMapSecret
    ) {
      if (model && category) {
        const available =
          current !== undefined
            ? await Db.getAvailable(model)
            : Event.available[category]
        available.sort((a, b) => a.localeCompare(b))

        if (equal !== undefined) {
          const compare =
            current !== undefined
              ? Event.available[category]
              : await Db.getAvailable(model)
          compare.sort((a, b) => a.localeCompare(b))
          res
            .status(200)
            .json(available.every((item, i) => item === compare[i]))
        } else {
          res.status(200).json(available)
        }
      } else {
        const available = await getAll(current)
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
    } else {
      throw new Error('Incorrect or missing API secret')
    }
    console.log(`[API] api/v1/${path.parse(__filename).name}`)
  } catch (e) {
    console.error(`[API Error] api/v1/${path.parse(__filename).name}`, e)
    res.status(500).json({ status: 'ServerError', reason: e.message })
  }
})

router.put('/:category', async (req, res) => {
  const { model, category } =
    queryObj[resolveCategory(req.params.category)] || {}
  try {
    if (
      api.reactMapSecret &&
      req.headers['react-map-secret'] === api.reactMapSecret
    ) {
      if (model && category) {
        await Event.setAvailable(category, model, Db)
      } else {
        await Promise.all([
          Event.setAvailable('pokemon', 'Pokemon', Db),
          Event.setAvailable('pokestops', 'Pokestop', Db),
          Event.setAvailable('gyms', 'Gym', Db),
          Event.setAvailable('nests', 'Nest', Db),
        ])
      }
      res
        .status(200)
        .json({ status: `updated availabled for ${category || 'all'}` })
    } else {
      throw new Error('Incorrect or missing API secret')
    }
    console.log(
      `[API] api/v1/${path.parse(__filename).name} - updated availabled for ${
        category || 'all'
      }`,
    )
  } catch (e) {
    console.error(`[API] api/v1/${path.parse(__filename).name}`, e)
    res.status(500).json({ status: 'ServerError', reason: e.message })
  }
})

module.exports = router

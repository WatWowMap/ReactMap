import express from "express"
import { Gym, Pokestop, Pokemon } from '../../../models/index.js'
import config from '../../../services/config.js'

const dataRouter = new express.Router()

dataRouter.get("/settings", async (req, res) => {
  try {
    const settings = {}
    settings.startLat = config.map.startLat
    settings.startLon = config.map.startLon
    settings.startZoom = config.map.startZoom
    res.status(200).json({ settings })
  } catch (error) {
    res.status(500).json({ error })
  }
})

dataRouter.get("/gyms", async (req, res) => {
  const { minLat, minLon, maxLat, maxLon } = req.query
  try {
    const gyms = await Gym.query()
      .whereBetween('lat', [minLat, maxLat])
      .andWhereBetween('lon', [minLon, maxLon])
    res.status(200).json({ gyms })
  } catch (error) {
    res.status(500).json({ error })
  }
})

dataRouter.get("/pokestops", async (req, res) => {
  const { minLat, minLon, maxLat, maxLon } = req.query
  try {
    const pokestops = await Pokestop.query()
      .whereBetween('lat', [minLat, maxLat])
      .andWhereBetween('lon', [minLon, maxLon])
    res.status(200).json({ pokestops })
  } catch (error) {
    res.status(500).json({ error })
  }
})

dataRouter.get("/pokemon", async (req, res) => {
  const { minLat, minLon, maxLat, maxLon } = req.query
  try {
    const ts = Math.floor((new Date).getTime() / 1000)
    const pokemon = await Pokemon.query()
      .where('expire_timestamp', '>=', ts)
      .andWhereBetween('lat', [minLat, maxLat])
      .andWhereBetween('lon', [minLon, maxLon])
    res.status(200).json({ pokemon })
  } catch (error) {
    res.status(500).json({ error })
  }
})

export default dataRouter
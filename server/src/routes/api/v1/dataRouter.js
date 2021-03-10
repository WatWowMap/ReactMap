import express from "express"
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

export default dataRouter
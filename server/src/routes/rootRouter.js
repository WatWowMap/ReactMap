import express from "express"
import clientRouter from './clientRouter.js'
import { graphqlHTTP } from 'express-graphql'
import schema from '../schema/schema.js'
import config from '../services/config.js'
import cors from 'cors'
import { Pokestop } from '../models/index.js'
import { raw } from 'objection'
import updateAvailableForms from '../services/updateAvailableForms.js'

const rootRouter = new express.Router()

rootRouter.use("/", clientRouter)

rootRouter.use('/graphql', cors(), graphqlHTTP({
  schema,
  graphiql: config.devOptions.graphiql
}))

rootRouter.get("/settings", async (req, res) => {
  try {
    const settings = {
      config: {},
      quests: {}
    }
    settings.config.env = config.devOptions.enabled
    settings.config.map = config.map
    settings.config.tileServers = config.tileServers
    settings.config.icons = config.icons
    settings.config.popUpDetails = config.popUpDetails
    settings.config.rarity = config.rarity

    await updateAvailableForms(settings.config.icons)

    settings.quests = await Pokestop.getAvailableQuests()

    res.status(200).json({ settings })
  } catch (error) {
    res.status(500).json({ error })
  }
})

export default rootRouter

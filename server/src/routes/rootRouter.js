import express from "express"
import clientRouter from './clientRouter.js' 
import { graphqlHTTP } from 'express-graphql'
import schema from '../schema/schema.js' 
import config from '../services/config.js' 
import cors from 'cors' 

import updateAvailableForms from '../services/updateAvailableForms.js' 

const rootRouter = new express.Router()

rootRouter.use("/", clientRouter)

rootRouter.use('/graphql', cors(), graphqlHTTP({
  schema,
  graphiql: config.devOptions.graphiql
}))

rootRouter.get("/config", async (req, res) => {
  try {
    const frontEndConfig = {}
    frontEndConfig.env = config.devOptions.enabled
    frontEndConfig.map = config.map
    frontEndConfig.tileServers = config.tileServers
    await updateAvailableForms(config.icons)
    frontEndConfig.icons = config.icons
    frontEndConfig.popUpDetails = config.popUpDetails
    frontEndConfig.rarity = config.rarity
    res.status(200).json({ config: frontEndConfig })
  } catch (error) {
    res.status(500).json({ error })
  }
})

export default rootRouter

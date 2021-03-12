import express from "express"
import clientRouter from './clientRouter.js' 
import { graphqlHTTP } from 'express-graphql'
import schema from '../schema/schema.js' 
import config from '../services/config.js' 
import cors from 'cors' 

const rootRouter = new express.Router()

rootRouter.use("/", clientRouter)

rootRouter.use('/graphql', cors(), graphqlHTTP({
  schema,
  graphiql: config.devOptions.graphiql
}))

rootRouter.get("/settings", async (req, res) => {
  try {
    const settings = {}
    settings.env = config.devOptions.enabled
    settings.map = config.map
    settings.tileservers = config.tileservers
    settings.icons = config.icons
    settings.popUpDetails = config.popUpDetails
    settings.rarity = config.rarity
    res.status(200).json({ settings })
  } catch (error) {
    res.status(500).json({ error })
  }
})

export default rootRouter

import express from "express"
import clientRouter from './clientRouter.js' 
import dataRouter from './api/v1/dataRouter.js' 

const rootRouter = new express.Router()

rootRouter.use("/", clientRouter)

rootRouter.use("/api/v1/data", dataRouter)

export default rootRouter

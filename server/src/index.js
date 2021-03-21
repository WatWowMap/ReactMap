import express from 'express'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import logger from "morgan"
import '../knexfile.js'
import rootRouter from './routes/rootRouter.js'
import addMiddlewares from './middlewares/addMiddlewares.js'
import hbsMiddleware from "express-handlebars"
import config from './services/config.js' 

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()

app.set("views", path.join(__dirname, "../views"))
app.engine(
  "hbs",
  hbsMiddleware({
    defaultLayout: "default",
    extname: ".hbs",
  })
)
app.set("view engine", "hbs")

app.use(logger("dev"))

app.use(express.json({limit: '50mb'}))

app.use(express.static(path.join(__dirname, "../../client/public")))

addMiddlewares(app)

app.use(rootRouter)

app.listen(config.port, () => {
  console.log(`Server is now listening at http://${config.interface}:${config.port}`)
})

export default app

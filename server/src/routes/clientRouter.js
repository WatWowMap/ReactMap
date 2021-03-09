import express from "express"
import { fileURLToPath } from "url"
import path, { dirname } from "path"

const clientRouter = new express.Router()

const getClientIndexPath = () => {
  const currentPath = dirname(fileURLToPath(import.meta.url))
  const indexPath = path.join(currentPath, "../../../client/public/index.html")
  return indexPath
}

const clientRoutes = [
  "/"
]

clientRouter.get(clientRoutes, (req, res) => {
  res.sendFile(getClientIndexPath())
})

export default clientRouter

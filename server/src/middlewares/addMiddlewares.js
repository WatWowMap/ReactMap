import clientMiddlewares from "./clientMiddlewares.js"

const addMiddlewares = async app => {
  await clientMiddlewares(app)
}

export default addMiddlewares

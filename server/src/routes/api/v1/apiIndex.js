const router = require('express').Router()
const usersRouter = require('./users')

router.use('/users', usersRouter)

module.exports = router

const { connection } = require('./knexfile.cjs')

async function migrate() {
  await connection.migrate.latest()
  await connection.destroy()
}

module.exports = { migrate }

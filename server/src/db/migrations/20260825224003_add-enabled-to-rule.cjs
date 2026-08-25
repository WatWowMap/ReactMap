// A rule can be switched off without being deleted. NOT NULL with a true
// default, so every row that already exists comes out enabled and nothing
// about an existing profile's map changes when this runs.
exports.up = async (knex) => {
  await knex.schema.alterTable('rule', (table) => {
    table.boolean('enabled').notNullable().defaultTo(true)
  })
}

exports.down = async (knex) => {
  await knex.schema.alterTable('rule', (table) => {
    table.dropColumn('enabled')
  })
}

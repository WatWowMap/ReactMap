// @ts-check
exports.up = async function up(knex) {
  await knex.schema.createTable('user_perms', (table) => {
    table.string('id', 36).primary()
    table.string('user_id', 36).notNullable()
    table.string('provider_id', 191).notNullable()
    table.json('perms').notNullable()
    table
      .timestamp('updated_at', { precision: 3 })
      .notNullable()
      .defaultTo(knex.fn.now(3))
    table.unique(['user_id', 'provider_id'], {
      indexName: 'user_perms_user_provider_uidx',
    })
    table.index('user_id', 'user_perms_user_id_idx')
    table.foreign('user_id').references('auth_user.id').onDelete('CASCADE')
  })
}

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('user_perms')
}

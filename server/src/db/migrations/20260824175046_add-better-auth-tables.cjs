// @ts-check
exports.up = async function up(knex) {
  await knex.schema.createTable('auth_user', (table) => {
    table.string('id', 36).primary()
    table.string('name', 255).notNullable()
    table.string('email', 255).notNullable().unique()
    table.boolean('email_verified').notNullable().defaultTo(false)
    table.text('image')
    table.string('username', 255).unique()
    table.text('display_username')
    table.bigInteger('legacy_id').nullable()
    table
      .timestamp('created_at', { precision: 3 })
      .notNullable()
      .defaultTo(knex.fn.now(3))
    table
      .timestamp('updated_at', { precision: 3 })
      .notNullable()
      .defaultTo(knex.fn.now(3))
    table.index('legacy_id', 'auth_user_legacy_id_idx')
  })

  await knex.schema.createTable('auth_session', (table) => {
    table.string('id', 36).primary()
    table.string('token', 255).notNullable().unique()
    table.timestamp('expires_at', { precision: 3 }).notNullable()
    table.text('ip_address')
    table.text('user_agent')
    table.string('user_id', 36).notNullable()
    table
      .timestamp('created_at', { precision: 3 })
      .notNullable()
      .defaultTo(knex.fn.now(3))
    table
      .timestamp('updated_at', { precision: 3 })
      .notNullable()
      .defaultTo(knex.fn.now(3))
    table.index('user_id', 'auth_session_user_id_idx')
    table.foreign('user_id').references('auth_user.id').onDelete('CASCADE')
  })

  await knex.schema.createTable('auth_account', (table) => {
    table.string('id', 36).primary()
    table.string('issuer', 191).notNullable()
    table.string('account_id', 191).notNullable()
    table.string('provider_id', 191).notNullable()
    table.string('user_id', 36).notNullable()
    table.text('access_token')
    table.text('refresh_token')
    table.text('id_token')
    table.timestamp('access_token_expires_at', { precision: 3 })
    table.timestamp('refresh_token_expires_at', { precision: 3 })
    table.text('scope')
    table.text('password')
    table
      .timestamp('created_at', { precision: 3 })
      .notNullable()
      .defaultTo(knex.fn.now(3))
    table
      .timestamp('updated_at', { precision: 3 })
      .notNullable()
      .defaultTo(knex.fn.now(3))
    table.unique(['issuer', 'account_id'], {
      indexName: 'auth_account_issuer_account_uidx',
    })
    table.index('user_id', 'auth_account_user_id_idx')
    table.foreign('user_id').references('auth_user.id').onDelete('CASCADE')
  })

  await knex.schema.createTable('auth_verification', (table) => {
    table.string('id', 36).primary()
    table.string('identifier', 255).notNullable()
    table.text('value').notNullable()
    table.timestamp('expires_at', { precision: 3 }).notNullable()
    table
      .timestamp('created_at', { precision: 3 })
      .notNullable()
      .defaultTo(knex.fn.now(3))
    table
      .timestamp('updated_at', { precision: 3 })
      .notNullable()
      .defaultTo(knex.fn.now(3))
    table.index('identifier', 'auth_verification_identifier_idx')
  })
}

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('auth_verification')
  await knex.schema.dropTableIfExists('auth_account')
  await knex.schema.dropTableIfExists('auth_session')
  await knex.schema.dropTableIfExists('auth_user')
}

exports.up = async (knex) => {
  await knex.schema.createTable('profile', (table) => {
    table.increments('id').primary()
    table.string('user_id', 36).notNullable().index()
    table.boolean('system').notNullable().defaultTo(false)
    table.string('name', 64).notNullable()
    table.json('areas').nullable()
    table.json('location').nullable()
    table.json('preferences').nullable()
    // Bumped on every rule write so an open map can notice its cached
    // rules went stale. See rules-repo.ts.
    table.integer('rules_version').notNullable().defaultTo(0)
  })

  await knex.schema.createTable('rule', (table) => {
    table.increments('id').primary()
    table.string('user_id', 36).notNullable()
    table.integer('profile_id').unsigned().notNullable()
    table.string('category', 16).notNullable()
    table.string('name', 64).notNullable()
    table.string('size', 8).nullable()
    table.string('glow', 16).nullable()
    table.boolean('notify').notNullable().defaultTo(false)
    table.index(['user_id', 'profile_id'])
  })

  await knex.schema.createTable('rule_pokemon', (table) => {
    table.integer('rule_id').unsigned().primary()
    table.integer('species_id').nullable()
    table.integer('form_id').nullable()
    table.integer('pvp_target_species').nullable()
    table.integer('iv_min').nullable()
    table.integer('iv_max').nullable()
    table.integer('atk_min').nullable()
    table.integer('atk_max').nullable()
    table.integer('def_min').nullable()
    table.integer('def_max').nullable()
    table.integer('sta_min').nullable()
    table.integer('sta_max').nullable()
    table.integer('level_min').nullable()
    table.integer('level_max').nullable()
    table.integer('cp_min').nullable()
    table.integer('cp_max').nullable()
    table.integer('gender').nullable()
    table.integer('size_min').nullable() // 1 = XXS .. 5 = XXL
    table.integer('size_max').nullable()
    table.integer('pvp_league').nullable() // NULL | 500 | 1500 | 2500
    table.integer('pvp_rank_min').nullable()
    table.integer('pvp_rank_max').nullable()
  })

  await knex.schema.createTable('rule_exclusion', (table) => {
    table.increments('id').primary()
    table.integer('rule_id').unsigned().notNullable().index()
    table.integer('species_id').notNullable()
    table.integer('form_id').nullable() // NULL means any form
  })
}

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('rule_exclusion')
  await knex.schema.dropTableIfExists('rule_pokemon')
  await knex.schema.dropTableIfExists('rule')
  await knex.schema.dropTableIfExists('profile')
}

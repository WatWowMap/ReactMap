import {
  boolean,
  index,
  int,
  json,
  mysqlTable,
  varchar,
} from 'drizzle-orm/mysql-core'

const profile = mysqlTable(
  'profile',
  {
    id: int('id').autoincrement().primaryKey(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    system: boolean('system').default(false).notNull(),
    name: varchar('name', { length: 64 }).notNull(),
    areas: json('areas'),
    location: json('location'),
    preferences: json('preferences'),
    // Bumped on every rule write so an open map can notice its cached
    // rules went stale. See rules-repo.ts.
    rulesVersion: int('rules_version').default(0).notNull(),
  },
  (table) => [index('profile_user_id_idx').on(table.userId)],
)

const rule = mysqlTable(
  'rule',
  {
    id: int('id').autoincrement().primaryKey(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    profileId: int('profile_id').notNull(),
    category: varchar('category', { length: 16 }).notNull(),
    name: varchar('name', { length: 64 }).notNull(),
    size: varchar('size', { length: 8 }),
    glow: varchar('glow', { length: 16 }),
    notify: boolean('notify').default(false).notNull(),
    // A rule the user switched off: kept, listed, and editable, but it
    // matches nothing until it is switched back on.
    enabled: boolean('enabled').default(true).notNull(),
  },
  (table) => [
    index('rule_user_id_profile_id_idx').on(table.userId, table.profileId),
  ],
)

const rulePokemon = mysqlTable('rule_pokemon', {
  ruleId: int('rule_id').primaryKey(),
  speciesId: int('species_id'),
  formId: int('form_id'),
  pvpTargetSpecies: int('pvp_target_species'),
  ivMin: int('iv_min'),
  ivMax: int('iv_max'),
  atkMin: int('atk_min'),
  atkMax: int('atk_max'),
  defMin: int('def_min'),
  defMax: int('def_max'),
  staMin: int('sta_min'),
  staMax: int('sta_max'),
  levelMin: int('level_min'),
  levelMax: int('level_max'),
  cpMin: int('cp_min'),
  cpMax: int('cp_max'),
  gender: int('gender'),
  sizeMin: int('size_min'), // 1 = XXS .. 5 = XXL
  sizeMax: int('size_max'),
  pvpLeague: int('pvp_league'), // NULL | 500 | 1500 | 2500
  pvpRankMin: int('pvp_rank_min'),
  pvpRankMax: int('pvp_rank_max'),
})

const ruleExclusion = mysqlTable(
  'rule_exclusion',
  {
    id: int('id').autoincrement().primaryKey(),
    ruleId: int('rule_id').notNull(),
    speciesId: int('species_id').notNull(),
    formId: int('form_id'), // NULL means any form
  },
  (table) => [index('rule_exclusion_rule_id_idx').on(table.ruleId)],
)

export { profile, rule, ruleExclusion, rulePokemon }

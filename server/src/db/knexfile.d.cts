// Ambient declaration for the sibling `knexfile.cjs`, which stays
// CommonJS on purpose -- knex loads migration config files by filename
// from disk, and this task does not convert it (see the task brief:
// "leave the migrations alone unless you can show they still work").
// This file only teaches the typechecker the two named exports
// `knexfile.cjs` actually assigns.
import type { Knex } from 'knex'

export const knexConfig: Knex.Config
declare const config: Knex.Config
export default config

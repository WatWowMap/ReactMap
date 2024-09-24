import type { Models } from '@rm/server/src/models'

import type { FullModel } from './utility'
import type { Permissions } from './server'
import type { Strategy } from './general'

export interface Backup {
  id: number
  name: string
  userId: number
  data: string | object
  createdAt: number
  updatedAt: number
}
export type FullBackup = FullModel<Backup, Models['Backup']>

export interface User {
  id: number
  discordId?: string
  username?: string
  telegramId?: string
  password?: string
  discordPerms?: Permissions
  telegramPerms?: Permissions
  webhookStrategy?: Strategy
  strategy?: Strategy
  data?: string | object
  selectedWebhook?: string
  tutorial?: boolean
}

export type FullUser = FullModel<User, Models['User']>

export interface Session {
  session_id: string
  expires: number
  data: string | object
}

export type FullSession = FullModel<Session, Models['Session']>

export interface NestSubmission {
  nest_id: number
  user_id: number
  name: string
  submitted_by: string
}

export type FullNestSubmission = FullModel<
  NestSubmission,
  Models['NestSubmission']
>

export interface GymBadge {
  id: number
  userId: number
  gymId: string
  badge: 1 | 2 | 3
  createdAt: number
  updatedAt: number
}

export type FullGymBadge = FullModel<GymBadge, Models['Badge']>

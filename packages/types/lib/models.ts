import type { User as UserModel } from '@rm/server/src/models/User'
import type { Backup as BackupModel } from '@rm/server/src/models/Backup'
import type { Session as SessionModel } from '@rm/server/src/models/Session'
import type { NestSubmission as NestSubmissionModel } from '@rm/server/src/models/NestSubmission'
import type { Badge as BadgeModel } from '@rm/server/src/models/Badge'

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
export type FullBackup = FullModel<Backup, BackupModel>

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

export type FullUser = FullModel<User, UserModel>

export interface Session {
  session_id: string
  expires: number
  data: string | object
}

export type FullSession = FullModel<Session, SessionModel>

export interface NestSubmission {
  nest_id: number
  user_id: number
  name: string
  submitted_by: string
}

export type FullNestSubmission = FullModel<NestSubmission, NestSubmissionModel>

export interface GymBadge {
  id: number
  userId: number
  gymId: string
  badge: 1 | 2 | 3
  createdAt: number
  updatedAt: number
}

export type FullGymBadge = FullModel<GymBadge, BadgeModel>

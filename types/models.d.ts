import { Permissions } from './server'
import UserModel = require('../server/src/models/NestSubmission')
import BackupModel = require('../server/src/models/Backup')
import SessionModel = require('../server/src/models/Session')
import NestSubmissionModel = require('../server/src/models/NestSubmission')
import GymBadgeModel = require('../server/src/models/GymBadge')

export interface Backup {
  id: number
  name: string
  userId: number
  data: string | object
  createdAt: number
  updatedAt: number
}
export interface FullBackup extends Backup, BackupModel {}

export interface User {
  id?: number
  discordId?: string
  username?: string
  telegramId?: string
  password?: string
  discordPerms?: Permissions
  telegramPerms?: Permissions
  webhookStrategy?: string
  strategy?: string
  data?: string | object
  selectedWebhook?: string
}

export type FullUser = User & UserModel

export interface Session {
  session_id: string
  expires: number
  data: string | object
}

export interface FullSession extends Session, SessionModel {}

export interface NestSubmission {
  nest_id: number
  user_id: number
  name: string
  submitted_by: string
}

export interface FullNestSubmission
  extends NestSubmission,
    NestSubmissionModel {}

export interface GymBadge {
  id: number
  userId: number
  gymId: string
  badge: 1 | 2 | 3
  createdAt: number
  updatedAt: number
}

export interface FullGymBadge extends GymBadge, GymBadgeModel {}

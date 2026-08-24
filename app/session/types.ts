export interface SessionUser {
  loggedIn: boolean
  username?: string
  perms: Record<string, unknown>
}

export interface SessionSettings {
  user: SessionUser
}

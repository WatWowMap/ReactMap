export interface SessionUser {
  loggedIn: boolean
  username?: string
  perms: Record<string, unknown>
}

export interface SessionAuthentication {
  loggedIn: boolean
  /**
   * The sign-in methods this instance offers, from the operator's enabled
   * strategies. Empty means there is no way in, which is a real state: an
   * instance can run entirely on `alwaysEnabledPerms` with no auth at all.
   */
  methods: string[]
}

export interface SessionSettings {
  user: SessionUser
  /**
   * Optional because it arrives over the wire. The server always sends it,
   * but a client that assumes a response shape is a client that throws when
   * an older server does not send it.
   */
  authentication?: SessionAuthentication
}

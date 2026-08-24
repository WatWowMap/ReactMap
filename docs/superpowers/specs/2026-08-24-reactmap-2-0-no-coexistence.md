# ReactMap 2.0: no coexistence

## What changed

2.0 is never deployed to production before it is merged. Operators run it alongside prod at a
separate host, `beta.example.com` or similar. So the 2.0 server does not have to serve the 1.0
client, and nothing on the v2 branch has to keep 1.x working.

This was true from the start. The client shape spec said 2.0 carries "no obligations to any public
surface except a migration path from existing RM tables." A migration path is a one time data
transform. It was read as a coexistence requirement instead, and that reading produced the
auth foundation's entire integration layer.

## Why this is worth a spec rather than a note

Every root cause found while building the auth foundation was classified by origin. Of 27, twenty
came from touching 1.x and seven were inherent to building 2.0 auth at all.

The seven were small and local: a missing column, a lookup keyed on the wrong name, a missing
guard. Each was found and closed in one round.

The twenty include every defect that survived a fix round, every one wrongly reported as closed,
and both findings where an entire layer was missing rather than a line being wrong. They are also
the ones no per-task review could see, because each task was individually correct and the defect
lived in the space between 2.0 and 1.x.

That distribution is the argument. Coexistence was not a tax on the work, it was the work.

## The shape

```
server/     Bun.serve, Better Auth, Drizzle, tRPC. No Express, no Apollo, no passport,
            no Objection. Its own tables and its own permission model.
app/        the 2.0 client. Its own login UI. Already carries zero GraphQL.
src/        the 1.0 client. Stays in the repo, served by nothing on this branch.
migration   one script. Reads 1.x tables, writes 2.0 tables, runs once, operator invoked.
```

Nothing crosses at runtime. The only contact between the two systems is a script an operator
runs deliberately, with output it can read and act on.

## Verified before writing this

`app/` contains zero GraphQL, Apollo, `useQuery` or `gql` usage. `src/` contains 62 such files.
The 2.0 client therefore loses nothing when Express and Apollo are removed from this branch,
because it has never used them.

## What carries over from the auth foundation

Roughly 1,442 lines are transport independent and survive: the `auth_*` and `user_perms` schema
and its migrations, the Telegram login widget HMAC verification, `buildAuthOptions`, and the
sign-in gate, permission recompute and revocation hooks, minus the places where they reach into
1.x's `DiscordClient` and `TelegramClient`.

Roughly 390 lines are discarded: the `req.user` shim that existed to satisfy 1.x resolvers, the
Express mount and middleware ordering, the trust proxy reconciliation between two servers, the
Express username availability gate, and the legacy OAuth callback bridge.

## What this does to the outstanding defects

Of the eighteen Criticals from the second whole branch review:

Six stop existing, because they are coexistence artifacts. The `legacy_id` runtime lookups have no
legacy tables to hit. The dead login entry points belong to a client this server no longer serves.
The back-fill refusal cannot take an instance offline once it is a script rather than a boot time
migration. The trust proxy divergence needs one server, not two, to agree with. The `req.user` and
permission shape problems have no consumer.

Three convert into building something properly rather than patching a bridge. Discord permissions
get written against the Discord API instead of calling a passport shaped 1.x method with an empty
guild list. Local permissions get written instead of resurrecting a deleted class. The migration
keeps its collision detection, but with an operator reading the output rather than a server
refusing to boot.

Five remain and are real: password sign-in reachable when the local strategy is disabled, the
`baseUrl` derived `trustedOrigins`, the sign-in gate failing open when no client is registered,
the session cap race, and username enumeration.

## Consequences to accept

The 2.0 client becomes the critical path. It cannot authenticate against anything until it has a
login UI, which means the filters and shell work now gates the auth work rather than following it.

The 1.0 client keeps living in `src/` unserved by this branch. It is what `main` ships, and it is
deleted or retired at merge, not before.

`useAppShell` and the two entry Vite build were built for coexistence inside one deployment. They
are harmless where they are and may still be wanted for a staged rollout after merge, so they stay
for now rather than being unpicked.

## The rule this leaves behind

Treat 1.0 as a requirements document, not as a dependency. When 2.0 needs a behaviour that 1.x
has, read how 1.x did it and write it fresh. Do not import it, do not call into it, and do not
adapt it. Every time this project reached across that line it paid for it, and the tell was always
the same: the code on the other side would not fit, and the fix was to bend 2.0 to accommodate it.

# Golbat fort webhooks

ReactMap 2.0 gets gym and raid changes from Golbat's webhook sender rather
than by polling for them. Golbat POSTs each batch of changes to ReactMap, and
ReactMap forwards the ones a connected client is actually looking at straight
down that client's socket.

If you configure nothing, none of this happens. Clients stay on whatever the
reconciliation poll gives them, which on most Golbat instances is nothing at
all (see [Reconciliation](#reconciliation-and-fort_in_memory) below). Setting
this up is what makes gyms and raids work.

## Golbat side

Add ReactMap to the `webhooks` list in your Golbat config:

```toml
[[webhooks]]
url = "https://your-reactmap.example.com/api/webhooks/golbat"
types = ["gym", "raid", "fort_update"]
headers = ["X-ReactMap-Webhook-Secret:choose-a-long-random-value"]
```

The three types are the ones ReactMap reads:

| Type          | What it carries                                          |
| ------------- | -------------------------------------------------------- |
| `raid`        | Raid level, boss, timers, and the gym's team              |
| `gym`         | Gym details: name, image, guarding pokemon, open slots    |
| `fort_update` | A fort being added, renamed, moved, or removed            |

You can list other types on the same entry. ReactMap accepts the whole batch
and ignores what it has no use for, so quests, invasions, weather and pokemon
cost nothing but a little bandwidth if you leave them on.

`areas` and `exclude_areas` work as they do for any other Golbat webhook
consumer. Restricting them means ReactMap never hears about forts outside
those areas, and a client looking at one will not see it change.

## The shared secret

`GOLBAT_WEBHOOK_SECRET` (config key `golbat.webhookSecret`) is optional, and
it is set the same way `GOLBAT_API_URL` is. Leave it unset and the endpoint
accepts any POST that reaches it; ReactMap logs one warning at startup saying
so. That is deliberate rather than an oversight: Golbat's own `api_secret` is
optional too, and making this one mandatory would break every existing setup
on upgrade.

An unauthenticated endpoint means anyone who can reach your ReactMap can push
fabricated raids to your users. If ReactMap is exposed to the internet, set
the secret.

Set it on both sides:

- ReactMap: `GOLBAT_WEBHOOK_SECRET=choose-a-long-random-value`, or
  `golbat.webhookSecret` in your config file.
- Golbat: `headers = ["X-ReactMap-Webhook-Secret:choose-a-long-random-value"]`
  on the webhook entry.

Requests whose header does not match get a 401 and are not read any further.

### Two ways this fails silently

Golbat's header parser (`config/reader.go`, `splitIntoHeaderMap`) has two
behaviours worth knowing, because neither reports an error you would notice:

1. A colon in the secret drops the whole header. The parser splits the string
   on `:` and keeps the result only when it has exactly two parts. A secret
   containing a colon produces three, so the header is discarded, the POST
   arrives with no secret at all, and ReactMap answers 401 to every delivery.
   Generate secrets without colons.

2. A space after the colon becomes part of the value. The parser does not
   trim, so `"X-ReactMap-Webhook-Secret: hunter2"` sends the value `" hunter2"`
   with the leading space. ReactMap trims what it receives before comparing,
   so this one is handled, but write the pair without the space anyway. Other
   webhook consumers do not all trim.

If every delivery is coming back 401, check for a colon in the secret first.

## Reconciliation and `fort_in_memory`

Webhook delivery is best effort. If ReactMap is restarting, or a client's
socket is mid-reconnect when a change arrives, that change is missed. Normally
the gym reconciliation poll heals it within five minutes by re-scanning what
is in the viewport.

That poll calls Golbat's `POST /api/fort/scan`, which is gated behind
Golbat's experimental `fort_in_memory` setting. It is off by default, and
with it off every fort endpoint answers 503. ReactMap detects this at startup
from `GET /api/status` and stops polling rather than looping on refusals.

With `fort_in_memory` off, which is the default, webhooks are your only
source of fort data. A missed delivery is not corrected until that fort
changes again, which for a quiet gym can be hours, and a client that connects
sees nothing until the next change arrives. With it on, the poll fills in the
initial view when a client subscribes and heals missed deliveries within five
minutes.

Turning `fort_in_memory` on is what buys you reconciliation. It is
experimental in Golbat and costs memory proportional to your fort count, so
it is your call.

## Checking it works

ReactMap answers `202 Accepted` to a well-formed batch. From the machine
running Golbat:

```bash
curl -i -X POST https://your-reactmap.example.com/api/webhooks/golbat \
  -H 'Content-Type: application/json' \
  -H 'X-ReactMap-Webhook-Secret: your-secret' \
  -d '[]'
```

- `202` means the endpoint is reachable and the secret matched.
- `401` means the secret did not match, or Golbat dropped the header.
- `400` means the body was not a JSON array. Golbat always sends one.
- `404` means you are on ReactMap 1.x, which has no such endpoint.

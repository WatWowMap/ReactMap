// server/src/services/golbat-webhook-handler.ts
//
// The HTTP half of Task 6: `POST /api/webhooks/golbat`, mounted natively in
// `server/src/serve.ts`. Request in, Response out -- no middleware, nothing
// that wraps a write, matching how Better Auth and tRPC are mounted there.
//
// The one hard rule here is that the response must not wait on delivery,
// and the reason is that Golbat cannot protect itself if it does. Its
// sender's HTTP client is a bare `&http.Client{}` (webhooks/webhook.go:192)
// -- Go's zero value, which has no request timeout -- and the request is
// built with a plain `http.NewRequest`, no context deadline
// (webhooks/webhook.go:127). A hung receiver is not dropped after a few
// seconds; it holds that goroutine and connection open indefinitely while
// the sender's ticker keeps launching new flushes behind it. So a receiver
// that blocks does not merely lose its own batch, it slowly consumes the
// instance sending to it. The fan-out is an in-memory push into
// per-subscription queues (subscription-registry.ts) precisely so there is
// nothing to wait for -- the actual sends happen later, on each
// subscription's own loop.
//
// Authentication is OPTIONAL and deliberately so. Golbat's own `api_secret`
// is optional (routes.go:430-432 -- an empty secret disables auth entirely
// on its side), and requiring one here would silently break every existing
// operator's forts the moment they upgraded. So an unconfigured secret
// accepts the POST and the process warns once at boot instead
// (`warnIfWebhookSecretMissing`), rather than per request.

import config from '@rm/config'
import { log, TAGS } from '@rm/logger'

import { parseGolbatWebhookBatch, secretMatches } from './golbat-webhook'

/**
 * The header operators configure Golbat to send. Golbat supports arbitrary
 * per-webhook headers (`config.Webhook.Headers`, config/config.go:71,
 * applied at webhooks/webhook.go:137-139), so any name would work; this one
 * is chosen for being unambiguous next to Golbat's own `X-Golbat: hey!`.
 */
const GOLBAT_WEBHOOK_SECRET_HEADER = 'X-ReactMap-Webhook-Secret'

interface WebhookRegistry {
  dispatch: (injections: any[]) => void
}

/**
 * Logs, once at boot, that the webhook receiver is unauthenticated. Not per
 * request: Golbat batches on an interval and a busy instance would turn
 * this into a log flood that hides everything else.
 */
function warnIfWebhookSecretMissing(secret: string) {
  if (secret) return
  log.warn(
    TAGS.ReactMap,
    `POST /api/webhooks/golbat is accepting unauthenticated requests. Anyone who can reach this ` +
      `server can inject fort changes into connected clients. Set GOLBAT_WEBHOOK_SECRET (config ` +
      `key golbat.webhookSecret) and add "${GOLBAT_WEBHOOK_SECRET_HEADER}:<the same value>" to the ` +
      `headers list on Golbat's webhook entry. Write the pair with no space after the colon, and ` +
      `do not put a colon in the secret -- see docs/operators/golbat-webhooks.md for why both ` +
      `fail silently.`,
  )
}

function createGolbatWebhookHandler({
  registry,
  secret,
}: {
  registry: WebhookRegistry
  secret?: string
}) {
  const sharedSecret = secret ?? config.getSafe('golbat.webhookSecret') ?? ''

  return async function handleGolbatWebhook(request: Request) {
    if (sharedSecret) {
      const received = request.headers.get(GOLBAT_WEBHOOK_SECRET_HEADER)
      if (!secretMatches(sharedSecret, received)) {
        // No body read, no parsing, no dispatch: an unauthenticated caller
        // gets no work out of this process at all.
        return new Response('Unauthorized', { status: 401 })
      }
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return new Response('Body is not valid JSON', { status: 400 })
    }
    if (!Array.isArray(body)) {
      // webhooks/sender.go:21-25 -- Golbat always POSTs an array of
      // {type, message}. Anything else is a misconfigured sender, and
      // saying so is more useful than accepting it into a no-op.
      return new Response('Expected a JSON array of {type, message}', {
        status: 400,
      })
    }

    registry.dispatch(parseGolbatWebhookBatch(body))

    // 202: the changes are queued for delivery, which is the honest answer.
    // Whether every subscriber actually receives them is not something this
    // response can promise, and Golbat does not care -- it only checks that
    // the status is 2xx (webhooks/webhook.go).
    return new Response(null, { status: 202 })
  }
}

export {
  createGolbatWebhookHandler,
  GOLBAT_WEBHOOK_SECRET_HEADER,
  warnIfWebhookSecretMissing,
}

// @ts-check
/**
 *
 * @param {import("@rm/types").User} user
 * @param {import("@rm/types").GqlContext['Db']} Db
 * @param {import("@rm/types").GqlContext['Event']} Event
 */
async function validateSelectedWebhook(user, Db, Event) {
  if (user?.perms?.webhooks === undefined || user.perms.webhooks.length === 0)
    return null
  if (
    user.selectedWebhook &&
    user.perms.webhooks.includes(user.selectedWebhook) &&
    user.selectedWebhook in Event.webhookObj
  ) {
    return user.selectedWebhook
  }
  const validWebhook = Object.keys(Event.webhookObj).find((x) =>
    user.perms.webhooks.includes(x),
  )
  if (validWebhook) {
    const { selectedWebhook } = await Db.models.User.updateWebhook(
      user.id,
      validWebhook,
    )
    return selectedWebhook
  }
  return null
}

module.exports = validateSelectedWebhook

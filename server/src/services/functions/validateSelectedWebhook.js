// @ts-check
/**
 *
 * @param {import("types").User} user
 * @param {import("types").GqlContext['Db']} Db
 * @param {import("types").GqlContext['Event']} Event
 */
async function validateSelectedWebhook(user, Db, Event) {
  if (
    user.selectedWebhook &&
    user.perms.webhooks.includes(user.selectedWebhook) &&
    user.selectedWebhook in Event.webhookObj
  ) {
    return user.selectedWebhook
  }
  const validWebhook = Object.keys(Event.webhookObj)[0]
  const updatedUser = await Db.models.User.updateWebhook(user.id, validWebhook)
  return updatedUser.selectedWebhook
}

module.exports = validateSelectedWebhook

/* eslint-disable no-console */
const fetch = require('node-fetch')
const { webhooks } = require('../config')
const webhookConverter = require('./webhookConverter')

module.exports = async function webhookApi(category, discordId, method, data = null) {
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json' }
  switch (webhooks.provider) {
    case 'poracle': Object.assign(headers, { 'X-Poracle-Secret': webhooks.poracleSecret }); break
    default: break
  }
  try {
    return fetch(`${webhooks.host}:${webhooks.port}/api/tracking/${category}/${discordId}${method === 'DELETE' ? `/byUid/${data.uid}` : ''}`, {
      method,
      body: method === 'POST' ? JSON.stringify(webhookConverter(category, data)) : null,
      headers,
    }).then(res => res.json())
  } catch (e) {
    console.warn(e, `\nUnable to ${method} Poracle ${category} data for User ${discordId}`)
    return { status: false }
  }
}

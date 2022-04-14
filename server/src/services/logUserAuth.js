/* eslint-disable no-console */
const Fetch = require('./Fetch')

module.exports = async function getAuthInfo(req, user, strategy) {
  const ip = req.headers['cf-connecting-ip']
    || ((req.headers['x-forwarded-for'] || '').split(', ')[0])
    || (req.connection.remoteAddress || req.connection.localAddress).match('[0-9]+.[0-9].+[0-9]+.[0-9]+$')[0]

  const geo = await Fetch.json(`http://ip-api.com/json/${ip}?fields=66846719&lang=en`)
  const embed = {
    color: 0xFF0000,
    title: 'Authentication',
    author: {
      name: `${user.username}`,
      icon_url: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`,
    },
    description: `${user.username} Failed Authentication`,
    thumbnail: {
      url: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`,
    },
    fields: [
      {
        name: `${strategy} ID`,
        value: `<@${user.id}>`,
      },
      {
        name: 'Client Info',
        value: req.headers['user-agent'],
      },
      {
        name: 'Ip Address',
        value: `||${ip}||`,
      },
      {
        name: 'Geo Lookup',
        value: `${geo.city}, ${geo.regionName}, ${geo.zip}`,
      },
      {
        name: 'Google Map',
        value: `https://www.google.com/maps?q=${geo.lat},${geo.lon}`,
      },
      {
        name: 'Network Provider',
        value: `${geo.isp}, ${geo.as}`,
      },
      {
        name: 'Mobile',
        value: `${geo.mobile}`,
        inline: true,
      },
      {
        name: 'Proxy',
        value: `${geo.proxy}`,
        inline: true,
      },
      {
        name: 'Hosting',
        value: `${geo.hosting}`,
        inline: true,
      },
    ],
    timestamp: new Date(),
  }
  if (user.valid) {
    console.log('[DISCORD]', user.username, `(${user.id})`, 'Authenticated successfully.')
    embed.description = `${user.username} Successfully Authenticated`
    embed.color = 0x00FF00
  } else if (user.blocked) {
    console.warn('[DISCORD]', user.id, 'Blocked due to', user.blocked)
    embed.description = `User Blocked Due to ${user.blocked}`
    embed.color = 0xFF0000
  } else {
    console.warn('[DISCORD]', user.id, 'Not authorized to access map')
  }
  return embed
}

const axios = require('axios')
const DiscordStrategy = require('passport-discord').Strategy
const passport = require('passport')
const config = require('../services/config')
const { User } = require('../models/index')
const DiscordClient = require('../services/discord')

passport.serializeUser(async (user, done) => {
  done(null, user)
})

passport.deserializeUser(async (user, done) => {
  if (user.perms.map) {
    done(null, user)
  } else {
    done(null, false)
  }
})

const authHandler = async (req, accessToken, refreshToken, profile, done) => {
  DiscordClient.setAccessToken(accessToken)
  const user = {}
  user.id = profile.id
  user.username = `${profile.username}#${profile.discriminator}`
  user.perms = await DiscordClient.getPerms(profile)
  user.valid = user.perms.map !== false
  user.blocked = user.perms.blocked

  const ip = req.headers['cf-connecting-ip']
    || ((req.headers['x-forwarded-for'] || '').split(', ')[0])
    || (req.connection.remoteAddress || req.connection.localAddress).match('[0-9]+.[0-9].+[0-9]+.[0-9]+$')[0]

  const url = `http://ip-api.com/json/${ip}?fields=66846719&lang=${config.locale || 'en'}`
  const geoResponse = await axios.get(url)
  const geo = geoResponse.data
  const embed = {
    color: 0xFF0000,
    title: 'Failure',
    author: {
      name: `${user.username}`,
      icon_url: `https://cdn.discordapp.com/avatars/${user.id}/${profile.avatar}.png`,
    },
    description: 'User Failed Authentication',
    thumbnail: {
      url: `https://cdn.discordapp.com/avatars/${user.id}/${profile.avatar}.png`,
    },
    fields: [
      {
        name: 'Discord Id',
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
    console.log(user.username, `(${user.id})`, 'Authenticated successfully.')
    embed.title = 'Success'
    embed.description = 'User Successfully Authenticated'
    embed.color = 0x00FF00
  } else if (user.blocked) {
    console.warn(user.id, 'Blocked due to', user.blocked)
    embed.title = 'Blocked'
    embed.description = `User Blocked Due to ${user.blocked}`
    embed.color = 0xFF0000
  } else {
    console.warn(user.id, 'Not authorized to access map')
  }

  await DiscordClient.sendMessage(config.discord.logChannelId, { embed })

  await User.query()
    .findOne({ id: user.id })
    .then(async (userExists) => {
      if (!userExists) {
        await User.query()
          .insert({ id: user.id })
        return done(null, user)
      }
      return done(null, user)
    })
}

passport.use(new DiscordStrategy({
  clientID: config.discord.clientId,
  clientSecret: config.discord.clientSecret,
  callbackURL: config.discord.redirectUri,
  scope: ['identify', 'guilds', 'email'],
  passReqToCallback: true,
}, authHandler))

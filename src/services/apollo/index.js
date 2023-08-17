// @ts-check
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client'

import AbortableLink from './AbortableLink'

const abortableLink = new AbortableLink()

export const apolloCache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        badges: {
          merge(existing, incoming) {
            return incoming
          },
        },
        devices: {
          merge(existing, incoming) {
            return incoming
          },
        },
        gyms: {
          merge(existing, incoming) {
            return incoming
          },
        },
        nests: {
          merge(existing, incoming) {
            return incoming
          },
        },
        pokemon: {
          merge(existing, incoming) {
            return incoming
          },
        },
        pokestops: {
          merge(existing, incoming) {
            return incoming
          },
        },
        portals: {
          merge(existing, incoming) {
            return incoming
          },
        },
        spawnpoints: {
          merge(existing, incoming) {
            return incoming
          },
        },
      },
    },
    SearchQuest: {
      keyFields: ['id', 'with_ar'],
    },
    PoracleProfile: {
      keyFields: ['uid'],
    },
    PoraclePokemon: {
      keyFields: ['uid'],
    },
    PoracleGym: {
      keyFields: ['uid'],
    },
    PoracleRaid: {
      keyFields: ['uid'],
    },
    PoracleEgg: {
      keyFields: ['uid'],
    },
    PoracleInvasion: {
      keyFields: ['uid'],
    },
    PoracleLure: {
      keyFields: ['uid'],
    },
    PoracleQuest: {
      keyFields: ['uid'],
    },
    PoracleNest: {
      keyFields: ['uid'],
    },
    PoracleWeather: {
      keyFields: ['uid'],
    },
    Pokestop: {
      fields: {
        quests: {
          merge(existing, incoming) {
            return incoming
          },
        },
        invasions: {
          merge(existing, incoming) {
            return incoming
          },
        },
      },
    },
  },
})

const apolloClient = new ApolloClient({
  uri: '/graphql',
  link: abortableLink.concat(createHttpLink()),
  // @ts-ignore
  name: CONFIG.TITLE,
  // @ts-ignore
  version: CONFIG.VERSION,
  cache: apolloCache,
})

export default apolloClient

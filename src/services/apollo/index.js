// @ts-check
import { ApolloClient, createHttpLink, InMemoryCache } from '@apollo/client'

import { AbortableLink } from './AbortableLink'

const abortableLink = new AbortableLink()
const httpLink = createHttpLink({ uri: '/graphql' })

export const apolloCache = new InMemoryCache({
  typePolicies: {
    Query: {},
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
  },
})

export const apolloClient = new ApolloClient({
  link: abortableLink.concat(httpLink),
  clientAwareness: {
    name: encodeURIComponent(CONFIG.client.title),
    version: CONFIG.client.version,
  },
  cache: apolloCache,
})

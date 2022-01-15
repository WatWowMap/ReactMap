import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client'
import ApolloLinkTimeout from 'apollo-link-timeout'

const timeoutLink = new ApolloLinkTimeout(10000) // 10 second timeout

export default new ApolloClient({
  uri: '/graphql',
  link: timeoutLink.concat(createHttpLink({ uri: '/graphql' })),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          pokemon: {
            merge(existing, incoming) {
              return incoming
            },
          },
          gyms: {
            merge(existing, incoming) {
              return incoming
            },
          },
          pokestops: {
            merge(existing, incoming) {
              return incoming
            },
          },
        },
      },
      SearchQuest: {
        keyFields: ['id', 'with_ar'],
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
  }),
})

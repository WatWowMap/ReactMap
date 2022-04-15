import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client'
import { onError } from '@apollo/client/link/error'
import ApolloLinkTimeout from 'apollo-link-timeout'

const timeoutLink = new ApolloLinkTimeout(10000) // 10 second timeout

const errorLink = onError(({ networkError, graphQLErrors }) => {
  console.log('network error', networkError)
  console.log('graphql error', graphQLErrors)
  if (graphQLErrors.some(Boolean)) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.log(`[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`)
    })
  }
  if (networkError?.message === 'Response not successful: Received status code 400') {
    console.log('Redirecting')
    return { redirect: '/404' }
  }
})

export default new ApolloClient({
  uri: '/graphql',
  link: from([
    errorLink,
    timeoutLink.concat(createHttpLink({ uri: '/graphql' })),
  ]),
  cache: new InMemoryCache({
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
            badges: {
              merge(existing, incoming) {
                return incoming
              },
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

import { ApolloLink } from '@apollo/client'

/**
 * @author Mygod
 * @see AbortableContext
 */
export class AbortableLink extends ApolloLink {
  request(
    operation: import('@apollo/client').Operation,
    forward: import('@apollo/client').NextLink,
  ):
    | import('@apollo/client').Observable<import('@apollo/client').FetchResult>
    | null {
    const context = operation.getContext()
    return context.abortableContext
      ? context.abortableContext.handle(operation, forward)
      : forward(operation)
  }
}

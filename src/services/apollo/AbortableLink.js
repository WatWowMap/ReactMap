// @ts-check
/* eslint-disable class-methods-use-this */
import { ApolloLink } from '@apollo/client'

/**
 * @author Mygod
 * @see AbortableContext
 */
export default class AbortableLink extends ApolloLink {
  /**
   * @param {import("@apollo/client").Operation} operation
   * @param {import("@apollo/client").NextLink} [forward]
   * @returns {import("@apollo/client").Observable<import("@apollo/client").FetchResult> | null}
   */
  request(operation, forward) {
    const context = operation.getContext()
    return context.abortableContext
      ? context.abortableContext.handle(operation, forward)
      : forward(operation)
  }
}

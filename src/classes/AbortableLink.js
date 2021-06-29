import { ApolloLink } from '@apollo/client';

/**
 * @author Mygod
 * @see AbortableContext
 */
export default class AbortableLink extends ApolloLink {
  // eslint-disable-next-line class-methods-use-this
  request(operation, forward) {
    const context = operation.getContext();
    return context.abortableContext ? context.abortableContext.handle(operation, forward) : forward(operation);
  }
}

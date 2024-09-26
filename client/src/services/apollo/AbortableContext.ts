import { Observable } from '@apollo/client/utilities/observables/Observable'

/**
 * Based on: https://github.com/drcallaway/apollo-link-timeout
 * @see AbortableLink
 * @author Mygod
 */
export class AbortableContext {
  _pendingOp = null
  _error: string
  constructor(error = 'Request aborted') {
    this._pendingOp = null
    this._error = error
  }

  _abort() {
    if (!this._pendingOp) return
    const { controller, operation, observer, subscription } = this._pendingOp
    controller.abort() // abort fetch operation

    // if the AbortController in the operation context is one we created,
    // it's now "used up", so we need to remove it to avoid blocking any
    // future retry of the operation.
    const context = operation.getContext()
    let fetchOptions = context.fetchOptions || {}
    if (
      fetchOptions.controller === controller &&
      fetchOptions.signal === controller.signal
    ) {
      fetchOptions = {
        ...fetchOptions,
        controller: null,
        signal: null,
      }
      operation.setContext({ fetchOptions })
    }

    if (this._error) observer.error(new Error(this._error))
    subscription.unsubscribe()
  }

  handle(
    operation: import('@apollo/client').Operation,
    forward: import('@apollo/client').NextLink,
  ):
    | import('@apollo/client').Observable<import('@apollo/client').FetchResult>
    | null {
    // add abort controller and signal object to fetchOptions if they don't already exist
    const context = operation.getContext()
    let fetchOptions = context.fetchOptions || {}

    const controller: AbortController =
      fetchOptions.controller || new AbortController()

    fetchOptions = { ...fetchOptions, controller, signal: controller.signal }
    operation.setContext({ ...context, fetchOptions })

    const chainObservable = forward(operation) // observable for remaining link chain

    // skip this link if it's a subscription request (although we will not have subscription requests)
    // if (operation.query.definitions.find(
    //   (def) => def.kind === 'OperationDefinition',
    // ).operation === 'subscription') return chainObservable;

    // create local observable with timeout functionality (unsubscibe from chain observable and
    // return an error if the timeout expires before chain observable resolves)
    return new Observable((observer) => {
      const op: {
        controller: AbortController
        operation: import('@apollo/client').Operation
        observer: import('@apollo/client/utilities/observables/Observable').Observer<
          import('@apollo/client').FetchResult
        >
        subscription?: import('zen-observable-ts').Subscription
      } = {
        controller,
        operation,
        observer,
      }

      // listen to chainObservable for result and pass to localObservable if received before timeout
      const subscription = chainObservable.subscribe(
        (result) => {
          this._pendingOp = null
          observer.next(result)
          observer.complete()
        },
        (error) => {
          this._pendingOp = null
          observer.error(error)
          observer.complete()
        },
      )
      op.subscription = subscription
      this._abort()
      this._pendingOp = op

      // this function is called when a client unsubscribes from localObservable
      return () => {
        this._pendingOp = null
        subscription.unsubscribe()
      }
    })
  }
}

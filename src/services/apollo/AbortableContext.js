// @ts-check
import { Observable } from '@apollo/client/utilities/observables/Observable'

/**
 * Based on: https://github.com/drcallaway/apollo-link-timeout
 * @see AbortableLink
 * @author Mygod
 */
export default class AbortableContext {
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

  /**
   * @param {import("@apollo/client").Operation} operation
   * @param {import("@apollo/client").NextLink} [forward]
   * @returns {import("@apollo/client").Observable<import("@apollo/client").FetchResult> | null}
   */
  handle(operation, forward) {
    // add abort controller and signal object to fetchOptions if they don't already exist
    const context = operation.getContext()
    let fetchOptions = context.fetchOptions || {}

    /** @type {AbortController} */
    const controller = fetchOptions.controller || new AbortController()

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
      /**
       * @type {{
       *  controller: AbortController,
       *  operation: import("@apollo/client").Operation,
       *  observer: import("@apollo/client/utilities/observables/Observable").Observer<import("@apollo/client").FetchResult>,
       *  subscription?: import("zen-observable-ts").Subscription
       * }}
       */
      const op = {
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

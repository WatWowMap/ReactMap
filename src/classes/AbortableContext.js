import { Observable } from '@apollo/client/utilities/observables/Observable'

/**
 * Based on: https://github.com/drcallaway/apollo-link-timeout
 * @see AbortableLink
 * @author Mygod
 */
export default class AbortableContext {
  constructor() {
    this._pendingOp = []
  }

  abortAll() {
    this._pendingOp.forEach(({
      controller, operation, observer, subscription,
    }) => {
      controller.abort() // abort fetch operation

      // if the AbortController in the operation context is one we created,
      // it's now "used up", so we need to remove it to avoid blocking any
      // future retry of the operation.
      const context = operation.getContext()
      let fetchOptions = context.fetchOptions || {}
      if (fetchOptions.controller === controller && fetchOptions.signal === controller.signal) {
        fetchOptions = {
          ...fetchOptions,
          controller: null,
          signal: null,
        }
        operation.setContext({ fetchOptions })
      }

      observer.error(new Error('Request aborted'))
      subscription.unsubscribe()
    })
    this._pendingOp = []
  }

  _removeOp(op) {
    const i = this._pendingOp.indexOf((v) => v === op)
    if (i === -1) return
    const last = this._pendingOp.length - 1
    if (last > 0) this._pendingOp[i] = this._pendingOp[last]
    this._pendingOp.pop()
  }

  handle(operation, forward) {
    // add abort controller and signal object to fetchOptions if they don't already exist
    const context = operation.getContext()
    let fetchOptions = context.fetchOptions || {}

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
    return new Observable(observer => {
      const op = {
        controller, operation, observer,
      }

      // listen to chainObservable for result and pass to localObservable if received before timeout
      const subscription = chainObservable.subscribe(
        result => {
          this._removeOp(op)
          observer.next(result)
          observer.complete()
        },
        error => {
          this._removeOp(op)
          observer.error(error)
          observer.complete()
        },
      )
      op.subscription = subscription
      this._pendingOp.push(op)

      // this function is called when a client unsubscribes from localObservable
      return () => {
        this._removeOp(op)
        subscription.unsubscribe()
      }
    })
  }
}

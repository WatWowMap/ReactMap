import { useMemory } from '@store/useMemory'

import { AbortableContext } from './AbortableContext'

export class RobustTimeout extends AbortableContext {
  _category: keyof import('@rm/types').Config['api']['polling'] | number
  _ms: number
  _lastUpdated: number
  _pendingVariables: Partial<import('@apollo/client').OperationVariables>
  timeout: NodeJS.Timeout
  refetch: (
    variables?: import('@apollo/client').OperationVariables,
  ) => Promise<import('@apollo/client').ApolloQueryResult<any>>

  constructor(
    category: keyof import('@rm/types').Config['api']['polling'] | number,
  ) {
    super(null)
    this._category = category
    this._ms =
      (typeof category === 'number'
        ? category
        : useMemory.getState().polling[category] || 10) * 1000
    this._lastUpdated = 0
  }

  /**
   * @param {Partial<import("@apollo/client").OperationVariables>} [variables]
   * @returns {void}
   */
  doRefetch(
    variables?: Partial<import('@apollo/client').OperationVariables>,
  ): void {
    const now = Date.now()

    if (now - this._lastUpdated < (this._pendingOp ? 5000 : 500)) {
      if (variables !== undefined) {
        this._pendingVariables = variables
      }

      return
    }
    this._lastUpdated = now
    if (this._ms) {
      clearTimeout(this.timeout)
      this.timeout = setTimeout(() => this.doRefetch(), this._ms)
    }
    this.refetch(variables === undefined ? this._pendingVariables : variables)
    delete this._pendingVariables
  }

  setupTimeout(
    refetch: (
      variables?: import('@apollo/client').OperationVariables,
    ) => Promise<import('@apollo/client').ApolloQueryResult<any>>,
  ): void {
    this.refetch = refetch
    if (this._ms) {
      clearTimeout(this.timeout)
      this.timeout = setTimeout(() => this.doRefetch(), this._ms)
    }
  }

  off() {
    clearTimeout(this.timeout)
    delete this._pendingVariables
  }
}

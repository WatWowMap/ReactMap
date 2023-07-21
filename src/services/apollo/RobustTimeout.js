// @ts-check
import AbortableContext from './AbortableContext'

export default class RobustTimeout extends AbortableContext {
  /**
   * @param {number} ms
   */
  constructor(ms) {
    super(null)
    this._ms = ms
    this._lastUpdated = 0
  }

  /**
   * @param {Partial<import("@apollo/client").OperationVariables>} [variables]
   * @returns {void}
   */
  doRefetch(variables) {
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

  /**
   * @param {(variables?: import("@apollo/client").OperationVariables) => Promise<import("@apollo/client").ApolloQueryResult<any>>} refetch
   * @returns {void}
   */
  setupTimeout(refetch) {
    if (this.refetch === refetch) return
    this.refetch = refetch
    if (this._ms) {
      clearTimeout(this.timeout)
      this.timeout = setTimeout(() => this.doRefetch(), this._ms)
    }
  }

  off() {
    this._ms = null
    clearTimeout(this.timeout)
  }
}

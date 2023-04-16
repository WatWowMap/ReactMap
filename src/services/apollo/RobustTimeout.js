import AbortableContext from './AbortableContext'

export default class RobustTimeout extends AbortableContext {
  constructor(ms) {
    super()
    this._ms = ms
    this._lastUpdated = 0
  }

  doRefetch(variables) {
    const now = Date.now()
    if (now - this._lastUpdated < (this._pendingOp.length ? 10000 : 500)) {
      if (variables !== undefined) {
        this._pendingVariables = variables
      }
      return
    }
    this._lastUpdated = now
    this.abortAll()
    if (this._ms) {
      clearTimeout(this.timeout)
      this.timeout = setTimeout(() => this.doRefetch(), this._ms)
    }
    this.refetch(variables === undefined ? this._pendingVariables : variables)
    delete this._pendingVariables
  }

  setupTimeout(refetch) {
    if (this.refetch === refetch) return
    this.refetch = refetch
    if (this._ms) this.timeout = setTimeout(() => this.doRefetch(), this._ms)
  }
}

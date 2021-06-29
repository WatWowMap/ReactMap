import AbortableContext from './AbortableContext'

export default class RobustTimeout extends AbortableContext {
  constructor(ms) {
    super()
    this._ms = ms
    this._lastUpdated = 0
  }

  doRefetch(variables) {
    const now = Date.now()
    if (now - this._lastUpdated < (this._pendingOp.length ? 4000 : 500)) return
    this._lastUpdated = now
    this.abortAll()
    if (this._ms) {
      clearTimeout(this.timeout)
      this.timeout = setTimeout(() => this.doRefetch(), this._ms)
    }
    this.refetch(variables)
  }

  setupTimeout(refetch) {
    if (this.refetch === refetch) return
    this.refetch = refetch
    if (this._ms) this.timeout = setTimeout(() => this.doRefetch(), this._ms)
  }
}

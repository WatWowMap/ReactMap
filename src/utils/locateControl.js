// @ts-check
import { LocateControl } from 'leaflet.locatecontrol'

export const GEOLOCATION_ERROR_CODE = {
  PERMISSION_DENIED: 1,
  POSITION_UNAVAILABLE: 2,
  TIMEOUT: 3,
}

const isWatchedLocationError = (err, locateOptions, code) =>
  err.code === code && locateOptions?.watch

export const RecoveringLocateControl = LocateControl.extend({
  _onLocationError(err) {
    const { locateOptions } = this.options

    if (
      isWatchedLocationError(err, locateOptions, GEOLOCATION_ERROR_CODE.TIMEOUT)
    ) {
      return
    }

    if (
      isWatchedLocationError(
        err,
        locateOptions,
        GEOLOCATION_ERROR_CODE.POSITION_UNAVAILABLE,
      )
    ) {
      this.options.onLocationError(err, this)
      return
    }

    this.stop()
    this.options.onLocationError(err, this)
  },
})

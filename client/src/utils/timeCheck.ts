import SunCalc from 'suncalc'

export function timeCheck(lat: number, lon: number) {
  const date = new Date()
  const times = SunCalc.getTimes(date, lat, lon)

  switch (true) {
    case date > times.dawn && date < times.sunriseEnd:
      return 'dawn'
    case date > times.dusk && date < times.night:
      return 'dusk'
    case date > times.night || date < times.nightEnd:
      return 'night'
    default:
      return 'day'
  }
}

import { Icon } from 'leaflet' 

export default function (device) {
  const ts = ((new Date).getTime())/1000 - 900
  const deviceStatus = ts - device.last_seen < 900 ? '0' : '1'
  return new Icon({
    iconUrl: `/img/device/${deviceStatus}.png`,
    iconSize: [30, 30],
    iconAnchor: [20, 33.96],
    popupAnchor: [0, -41.96],
  })
}
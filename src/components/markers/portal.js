export default function portalMarker(portal) {
  const ts = ((new Date()).getTime()) / 1000
  return {
    color: ts - portal.imported > 86400 ? 'blue' : 'red',
    fillColor: ts - portal.imported > 86400 ? 'blue' : 'red',
    fillOpacity: 0.25,
  }
}

export default function portalMarker(portal, ts, settings) {
  return {
    color:
      ts - portal.imported > 86400 ? settings.oldPortals : settings.newPortals,
    fillColor:
      ts - portal.imported > 86400 ? settings.oldPortals : settings.newPortals,
    fillOpacity: 0.25,
  }
}

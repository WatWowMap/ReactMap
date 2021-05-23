import { useStatic } from '@hooks/useStore'

export default function portalMarker(portal) {
  const ts = ((new Date()).getTime()) / 1000
  const { map: { theme: { portalMods } } } = useStatic(state => state.config)
  return {
    color: ts - portal.imported > 86400 ? portalMods.old : portalMods.new,
    fillColor: ts - portal.imported > 86400 ? portalMods.old : portalMods.new,
    fillOpacity: 0.25,
  }
}

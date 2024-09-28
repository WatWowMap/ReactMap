import Map from '@mui/icons-material/Map'
import IconButton from '@mui/material/IconButton'
import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'

export function Navigation({
  lat,
  lon,
  size = 'large',
}: {
  lat: number
  lon: number
  size?: import('@mui/material').IconButtonProps['size']
}) {
  const nav = useStorage((s) => s.settings.navigation)
  const url = useMemory((s) => s.settings.navigation[nav]?.url)

  return (
    <IconButton
      disabled={!url}
      href={url
        ?.replace(/\{x\}/g, lat.toString())
        .replace(/\{y\}/g, lon.toString())}
      rel="noreferrer"
      size={size}
      style={{ color: 'inherit' }}
      target="_blank"
    >
      <Map />
    </IconButton>
  )
}

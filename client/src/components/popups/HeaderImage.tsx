import Avatar from '@mui/material/Avatar'
import Link from '@mui/material/Link'
import { useMemory } from '@store/useMemory'

export function HeaderImage({
  url,
  exEligible = false,
  arScanEligible = false,
  alt,
  large = false,
}: {
  url: string
  exEligible?: boolean
  arScanEligible?: boolean
  alt: string
  large?: boolean
}) {
  const Icons = useMemory((s) => s.Icons)
  const src = url ? url.replace('http://', 'https://') : Icons.getPokestops(0)

  const Image = (
    <Avatar
      alt={alt}
      src={src}
      style={{
        width: large ? 120 : 40,
        height: large ? 120 : 40,
        marginRight: large ? 0 : 5,
      }}
    />
  )

  return (
    <div className="ar-eligible">
      {large ? (
        <Link href={src} rel="noreferrer" target="_blank">
          {Image}
        </Link>
      ) : (
        Image
      )}
      {!!arScanEligible && (
        <img
          alt="ar"
          className="ar-logo"
          src={Icons.getMisc('ar')}
          style={{
            width: large ? 32 : 16,
            height: large ? 32 : 16,
          }}
        />
      )}
      {!!exEligible && (
        <img
          alt="ex"
          className="ex-logo"
          src={Icons.getMisc('ex')}
          style={{
            width: large ? 32 : 16,
            height: large ? 32 : 16,
          }}
        />
      )}
    </div>
  )
}

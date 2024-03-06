// @ts-check
import * as React from 'react'
import Avatar from '@mui/material/Avatar'
import Link from '@mui/material/Link'

import { useMemory } from '@store/useMemory'

export function HeaderImage({
  url,
  exEligible = false,
  arScanEligible = false,
  alt,
  large = false,
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
        <Link href={src} target="_blank" rel="noreferrer">
          {Image}
        </Link>
      ) : (
        Image
      )}
      {!!arScanEligible && (
        <img
          className="ar-logo"
          alt="ar"
          src={Icons.getMisc('ar')}
          style={{
            width: large ? 32 : 16,
            height: large ? 32 : 16,
          }}
        />
      )}
      {!!exEligible && (
        <img
          className="ex-logo"
          alt="ex"
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

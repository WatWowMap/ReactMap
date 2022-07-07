import React from 'react'
import { Avatar, Link } from '@material-ui/core'

export default function HeaderImage({
  url,
  exEligible,
  arScanEligible,
  alt,
  Icons,
  large,
}) {
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
      {Boolean(arScanEligible) && (
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
      {Boolean(exEligible) && (
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

import React from 'react'
import { Avatar } from '@material-ui/core'

export default function HeaderImage({
  url, backupImage, exEligible, arScanEligible, alt,
}) {
  const src = url
    ? url.replace('http://', 'https://')
    : backupImage

  return (
    <div className="ar-eligible">
      <Avatar
        alt={alt}
        src={src}
        style={{ width: 40, height: 40, marginRight: 5 }}
      />
      {Boolean(arScanEligible) && (
        <img
          className="ar-logo"
          src="/images/misc/ar.png"
        />
      )}
      {Boolean(exEligible) && (
        <img
          className="ex-logo"
          src="/images/misc/ex.png"
        />
      )}
    </div>
  )
}

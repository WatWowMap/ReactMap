// @ts-check
import * as React from 'react'

import { useStorage } from '@store/useStorage'

/** @param {React.ImgHTMLAttributes<HTMLImageElement>} props */
export function SettingIcon({ src, alt, ...props }) {
  const darkMode = useStorage((s) => s.darkMode)
  return (
    <img
      src={src}
      alt={alt}
      width={24}
      className={darkMode ? '' : 'darken-image'}
      {...props}
    />
  )
}

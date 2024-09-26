import { useStorage } from '@store/useStorage'

export function SettingIcon({
  src,
  alt,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement>) {
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

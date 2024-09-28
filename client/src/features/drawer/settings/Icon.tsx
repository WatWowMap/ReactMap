import { useStorage } from '@store/useStorage'

export function SettingIcon({
  src,
  alt,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement>) {
  const darkMode = useStorage((s) => s.darkMode)

  return (
    <img
      alt={alt}
      className={darkMode ? '' : 'darken-image'}
      src={src}
      width={24}
      {...props}
    />
  )
}

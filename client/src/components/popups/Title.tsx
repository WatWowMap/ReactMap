import Typography from '@mui/material/Typography'
import { useStorage } from '@store/useStorage'

export function Title({
  children,
  variant = 'subtitle2',
  backup,
  ...props
}: {
  backup?: string
} & import('@mui/material').TypographyProps) {
  const names = useStorage((s) => !!s.popups.names)

  return (
    <Typography
      align="center"
      noWrap={names}
      variant={variant}
      onClick={() =>
        useStorage.setState((prev) => ({
          popups: {
            ...prev.popups,
            names: !prev.popups.names,
          },
        }))
      }
      {...props}
    >
      {children || backup}
    </Typography>
  )
}

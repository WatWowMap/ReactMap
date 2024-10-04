import Typography, { TypographyProps } from '@mui/material/Typography'

export function CustomText({
  className,
  variant,
  sx,
  color,
  style,
  children,
}: TypographyProps) {
  return (
    <Typography
      className={className}
      color={color}
      style={style}
      sx={sx}
      variant={variant}
    >
      {children}
    </Typography>
  )
}

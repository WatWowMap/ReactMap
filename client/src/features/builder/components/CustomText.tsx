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
      variant={variant}
      color={color}
      style={style}
      sx={sx}
    >
      {children}
    </Typography>
  )
}

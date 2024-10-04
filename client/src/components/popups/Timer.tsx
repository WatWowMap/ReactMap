import Typography from '@mui/material/Typography'
import { useRelativeTimer } from '@hooks/useRelativeTime'

export function Timer({
  expireTime,
  ...props
}: { expireTime?: number } & Omit<
  import('@mui/material').TypographyProps,
  'children'
>) {
  const time = useRelativeTimer(expireTime)

  return (
    <Typography variant="subtitle2" {...props}>
      {time}
    </Typography>
  )
}

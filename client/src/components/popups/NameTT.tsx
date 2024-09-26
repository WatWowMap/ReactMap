import Tooltip from '@mui/material/Tooltip'
import { useTranslation } from 'react-i18next'

export function NameTT({
  title,
  children,
}: { title: string | string[] } & Omit<
  import('@mui/material').TooltipProps,
  'title'
>) {
  const { t } = useTranslation()

  return (
    <Tooltip
      enterDelay={0}
      enterTouchDelay={0}
      placement="left-start"
      title={
        Array.isArray(title)
          ? title
              .filter(Boolean)
              .map((i) => t(i))
              .join(' ')
          : t(title)
      }
    >
      {children}
    </Tooltip>
  )
}

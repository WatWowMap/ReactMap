import Menu, { MenuProps } from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import { useTranslation } from 'react-i18next'

export function Dropdown({
  options,
  anchorEl,
  ...props
}: {
  options: {
    name: string | React.ReactNode
    action: () => void
    key?: string
  }[]
} & Omit<MenuProps, 'open'>) {
  const { t } = useTranslation()

  return (
    <Menu
      keepMounted
      PaperProps={{
        style: {
          maxHeight: 216,
          minWidth: 20,
          margin: '10px 0px',
        },
      }}
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      {...props}
    >
      {options.map((option, i) => (
        <MenuItem
          key={
            option.key || (typeof option.name === 'string' ? option.name : i)
          }
          dense
          onClick={option.action}
        >
          {typeof option.name === 'string' ? t(option.name) : option.name}
        </MenuItem>
      ))}
    </Menu>
  )
}

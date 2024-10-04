import * as React from 'react'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import TextField from '@mui/material/TextField'
import CircularProgress from '@mui/material/CircularProgress'
import HighlightOffIcon from '@mui/icons-material/HighlightOff'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@apollo/client'
import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { SEARCHABLE } from '@services/queries/config'
import { Img } from '@components/Img'

const SearchImage = React.memo(
  ({ name }: { name: string }) => {
    const { t } = useTranslation()

    const darkMode = useStorage((s) => s.darkMode)
    const Icons = useMemory((s) => s.Icons)

    return (
      <Img
        alt={t(name)}
        className={darkMode ? '' : 'darken-image'}
        maxHeight={20}
        maxWidth={20}
        src={Icons.getMisc(name)}
      />
    )
  },
  (prev, next) => prev.name === next.name,
)

SearchImage.displayName = 'SearchImage'

const EndAdornment = React.memo(
  ({
    children,
    disabled,
  }: {
    children: React.ReactNode
    disabled: boolean
  }) => {
    const loading = useMemory((s) => s.searchLoading)

    return (
      <>
        <IconButton
          disabled={disabled}
          sx={{ p: 1.25 }}
          onClick={() => useStorage.setState({ search: '' })}
        >
          {loading ? (
            <CircularProgress
              size={24}
              sx={(theme) => ({
                color: theme.palette.getContrastText(
                  theme.palette.background.default,
                ),
              })}
            />
          ) : (
            <HighlightOffIcon />
          )}
        </IconButton>
        <Divider orientation="vertical" sx={{ height: 28, m: 0.5 }} />
        {children}
      </>
    )
  },
)

EndAdornment.displayName = 'EndAdornment'

export function renderInput({
  InputProps,
  ...props
}: import('@mui/material').AutocompleteRenderInputParams) {
  const { t } = useTranslation()

  const searchTab = useStorage((s) => s.searchTab)

  const { data } = useQuery(SEARCHABLE, {
    fetchPolicy: 'cache-first',
  })

  const [anchorEl, setAnchorEl] = React.useState(null)

  const handleClose = React.useCallback(
    (/** @type {string} */ selection: string) => {
      if (typeof selection === 'string') {
        useStorage.setState({ searchTab: selection })
      }
      setAnchorEl(null)
    },
    [],
  )

  React.useEffect(() => {
    if (
      data?.searchable?.length &&
      (typeof searchTab === 'number' || !data.searchable.includes(searchTab))
    ) {
      useStorage.setState({ searchTab: data?.searchable[0] })
    }
  }, [searchTab, data])

  return (
    <>
      <TextField
        placeholder={t(`global_search_${searchTab}`)}
        variant="standard"
        {...props}
        InputProps={{
          ...InputProps,
          sx: { pl: 2 },
          endAdornment: (
            <EndAdornment disabled={props.inputProps.value === ''}>
              <IconButton
                sx={{ p: 1.25, width: 40 }}
                onClick={(e) => setAnchorEl(e.currentTarget)}
              >
                <SearchImage name={searchTab} />
              </IconButton>
            </EndAdornment>
          ),
        }}
        sx={{ boxShadow: 1 }}
      />
      <Menu
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        elevation={0}
        open={!!anchorEl}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        onClose={handleClose}
      >
        {(data?.searchable || []).map((option) => (
          <MenuItem
            key={option}
            selected={option === searchTab}
            onClick={() => handleClose(option)}
          >
            <ListItemIcon>
              <SearchImage name={option} />
            </ListItemIcon>
            <ListItemText primary={t(option)} />
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}

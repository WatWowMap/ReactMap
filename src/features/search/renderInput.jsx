// @ts-check
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

import { useMemory } from '@hooks/useMemory'
import { useStorage } from '@hooks/useStorage'
import { SEARCHABLE } from '@services/queries/config'
import { Img } from '@components/layout/general/Img'

const SearchImage = React.memo(
  /** @param {{ name: string }} props */ ({ name }) => {
    const { t } = useTranslation()

    const darkMode = useStorage((s) => s.darkMode)
    const Icons = useMemory((s) => s.Icons)

    return (
      <Img
        className={darkMode ? '' : 'darken-image'}
        src={Icons.getMisc(name)}
        alt={t(name)}
        maxWidth={20}
        maxHeight={20}
      />
    )
  },
  (prev, next) => prev.name === next.name,
)

const EndAdornment = React.memo(
  /** @param {{ children: React.ReactNode, disabled: boolean }} props */ ({
    children,
    disabled,
  }) => {
    const loading = useMemory((s) => s.searchLoading)
    return (
      <>
        <IconButton
          sx={{ p: 1.25 }}
          disabled={disabled}
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
        <Divider sx={{ height: 28, m: 0.5 }} orientation="vertical" />
        {children}
      </>
    )
  },
)

/** @param {import('@mui/material').AutocompleteRenderInputParams} props */
export function renderInput({ InputProps, ...props }) {
  const { t } = useTranslation()

  const searchTab = useStorage((s) => s.searchTab)

  const { data } = useQuery(SEARCHABLE, {
    fetchPolicy: 'cache-first',
  })

  const [anchorEl, setAnchorEl] = React.useState(null)

  const handleClose = React.useCallback((/** @type {string} */ selection) => {
    if (typeof selection === 'string') {
      useStorage.setState({ searchTab: selection })
    }
    setAnchorEl(null)
  }, [])

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
        open={!!anchorEl}
        onClose={handleClose}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        elevation={0}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
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

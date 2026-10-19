// @ts-check
import * as React from 'react'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
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
import { BACKGROUND_STARS } from '@assets/constants'
import { useHasShinyPlayers } from '@hooks/usePersonalShiny'

const SearchImage = React.memo(
  /** @param {{ name: string }} props */ ({ name }) => {
    const { t } = useTranslation()

    const darkMode = useStorage((s) => s.darkMode)
    const Icons = useMemory((s) => s.Icons)

    // the three small blue stars the game marks special backgrounds with
    if (name === 'personalBackground') {
      return (
        <AutoAwesomeIcon
          titleAccess={t(name)}
          sx={{ fontSize: 20, color: BACKGROUND_STARS }}
        />
      )
    }
    return (
      <Img
        className={
          darkMode || `${name}`.startsWith('personal') ? '' : 'darken-image'
        }
        src={Icons.getMisc(name === 'personalShiny' ? 'sparkles' : name)}
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

/**
 * @param {import('@mui/material').AutocompleteRenderInputParams} props
 * @param {React.RefObject<HTMLInputElement | null>} [inputRef]
 */
export function renderInput({ InputProps, ...props }, inputRef) {
  const { t } = useTranslation()

  const searchTab = useStorage((s) => s.searchTab)

  const { data: queried } = useQuery(SEARCHABLE, {
    fetchPolicy: 'cache-first',
  })
  // the personal tabs only with active players, like the rest of personal
  // shiny; the server returns nothing for them otherwise
  const hasShinyPlayers = useHasShinyPlayers()
  const data = React.useMemo(
    () =>
      queried && {
        ...queried,
        searchable: (queried.searchable || []).filter(
          (option) => hasShinyPlayers || !`${option}`.startsWith('personal'),
        ),
      },
    [queried, hasShinyPlayers],
  )

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

  const handleInputRef = (node) => {
    const { ref } = props.inputProps
    if (typeof ref === 'function') {
      ref(node)
    } else if (ref && typeof ref === 'object') {
      ref.current = node
    }
    if (inputRef) {
      inputRef.current = node
    }
  }

  return (
    <>
      <TextField
        placeholder={t(`global_search_${searchTab}`)}
        variant="standard"
        inputRef={handleInputRef}
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

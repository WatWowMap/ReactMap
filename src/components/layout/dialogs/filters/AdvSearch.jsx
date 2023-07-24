import React from 'react'
import ClearIcon from '@mui/icons-material/Clear'
import { Paper, InputBase, IconButton } from '@mui/material'

import { useTranslation } from 'react-i18next'

export default function AdvSearch({ search, setSearch, category }) {
  const { t } = useTranslation()

  const handleSearchChange = (event) => {
    setSearch(event.target.value?.toString()?.toLowerCase() || '')
  }

  const resetSearch = () => {
    setSearch('')
  }

  return (
    <Paper
      elevation={0}
      variant="outlined"
      style={{
        padding: '2px 4px',
        display: 'flex',
        alignItems: 'center',
      }}
      key="search"
    >
      <InputBase
        sx={(theme) => ({ ml: theme.spacing(1), flex: 1 })}
        placeholder={t(`search_${category}`, t(`search_${category}s`))}
        name="search"
        value={search}
        onChange={handleSearchChange}
        fullWidth
        autoComplete="off"
        variant="outlined"
      />
      <IconButton sx={{ p: 1 }} onClick={resetSearch} size="large">
        <ClearIcon style={{ color: '#848484' }} />
      </IconButton>
    </Paper>
  )
}

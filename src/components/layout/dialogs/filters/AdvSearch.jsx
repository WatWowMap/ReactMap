import React from 'react'
import ClearIcon from '@mui/icons-material/Clear'
import { Paper, InputBase, IconButton } from '@mui/material'

import { useTranslation } from 'react-i18next'

import useStyles from '@hooks/useStyles'

export default function AdvSearch({ search, setSearch, category }) {
  const { t } = useTranslation()
  const classes = useStyles()

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
      className={classes.search}
      key="search"
    >
      <InputBase
        className={classes.input}
        placeholder={t(`search_${category}`, t(`search_${category}s`))}
        name="search"
        value={search}
        onChange={handleSearchChange}
        fullWidth
        autoComplete="off"
        variant="outlined"
      />
      <IconButton
        className={classes.iconButton}
        onClick={resetSearch}
        size="large"
      >
        <ClearIcon style={{ color: '#848484' }} />
      </IconButton>
    </Paper>
  )
}

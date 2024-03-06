// @ts-check
import * as React from 'react'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import PagesIcon from '@mui/icons-material/Pages'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import { useTranslation } from 'react-i18next'

import { Utility } from '@services/Utility'

import { useQuery } from '@apollo/client'
import { CUSTOM_COMPONENT } from '@services/queries/config'
import { setComponent, usePlayStore } from '../hooks/store'

const PAGES = ['loginPage', 'messageOfTheDay', 'donationPage']

const startIcon = <PagesIcon />

export function ComponentMenu() {
  const { t } = useTranslation()
  const component = usePlayStore((s) => s.component)
  const { data, loading, error } = useQuery(CUSTOM_COMPONENT, {
    fetchPolicy: 'network-only',
    variables: { component },
  })

  const [anchorEl, setAnchorEl] = React.useState(null)
  const [pendingComponent, setPendingComponent] = React.useState(null)

  /**
   *
   * @param {string} [newComponent]
   */
  const handleMenuClose = (newComponent) => () => {
    const { original, code } = usePlayStore.getState()
    setAnchorEl(null)
    if (newComponent) {
      if (original === code) {
        setComponent(newComponent)
      } else {
        setPendingComponent(newComponent)
      }
    }
  }

  const handleDialogClose = () => setPendingComponent(null)

  const handleDialogConfirm = () => {
    handleDialogClose()
    setComponent(pendingComponent)
  }

  React.useEffect(() => {
    usePlayStore.setState((prev) => {
      const code = data?.customComponent
        ? JSON.stringify(data?.customComponent, null, 2)
        : prev.code
      return { loading, error, code, original: code }
    })
  }, [data, loading, error])

  return (
    <>
      <Button
        color="inherit"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        startIcon={startIcon}
      >
        {t('component')}
      </Button>
      <Menu
        transitionDuration={200}
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={handleMenuClose()}
      >
        {PAGES.map((c) => (
          <MenuItem
            key={c}
            value={c}
            dense
            onClick={handleMenuClose(c)}
            selected={c === component}
          >
            {t(`component_${Utility.camelToSnake(c)}`)}
          </MenuItem>
        ))}
      </Menu>
      <Dialog open={!!pendingComponent} onClose={handleDialogClose}>
        <DialogTitle>You have unsaved changes</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to change components?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleDialogConfirm}>Confirm</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

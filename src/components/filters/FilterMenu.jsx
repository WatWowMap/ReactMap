// @ts-check
import * as React from 'react'

import { toggleDialog, useLayoutStore } from '@store/useLayoutStore'
import { useMemory } from '@store/useMemory'
import { StandardItem } from '@components/virtual/StandardItem'
import { Menu } from '@components/Menu'
import { Header } from '@components/dialogs/Header'

import { DialogWrapper } from '../dialogs/DialogWrapper'

/** @type {import('@components/dialogs/Footer').FooterButton[]} */
const EXTRA_BUTTONS = [
  {
    name: 'close',
    action: toggleDialog(false),
    color: 'secondary',
  },
]

export function FilterMenu() {
  const { open, category, type } = useLayoutStore((s) => s.dialog)
  const menuConfig = useMemory((s) => (category ? s.menus?.[category] : null))

  if (!category || !menuConfig || type !== 'filters') {
    return null
  }

  return (
    <DialogWrapper
      open={open && type === 'filters'}
      onClose={toggleDialog(false)}
      maxWidth="md"
    >
      <Header
        titles={`${category}_filters`}
        action={toggleDialog(false)}
        names={[category]}
      />
      <Menu category={category} extraButtons={EXTRA_BUTTONS}>
        {(_, key) => <StandardItem id={key} category={category} caption />}
      </Menu>
    </DialogWrapper>
  )
}

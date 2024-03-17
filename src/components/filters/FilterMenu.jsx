// @ts-check
import * as React from 'react'

import { toggleDialog, useLayoutStore } from '@store/useLayoutStore'
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

  return (category === 'pokemon' ||
    category === 'gyms' ||
    category === 'pokestops' ||
    category === 'nests') &&
    type === 'filters' ? (
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
  ) : null
}

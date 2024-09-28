import { toggleDialog, useLayoutStore } from '@store/useLayoutStore'
import { StandardItem } from '@components/virtual/StandardItem'
import { Menu } from '@components/Menu'
import { Header } from '@components/dialogs/Header'
import { FooterButton } from '@components/dialogs/Footer'

import { DialogWrapper } from '../dialogs/DialogWrapper'

const EXTRA_BUTTONS: FooterButton[] = [
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
    category === 'nests' ||
    category === 'stations') &&
    type === 'filters' ? (
    <DialogWrapper
      maxWidth="md"
      open={open && type === 'filters'}
      onClose={toggleDialog(false)}
    >
      <Header
        action={toggleDialog(false)}
        names={[category]}
        titles={`${category}_filters`}
      />
      <Menu category={category} extraButtons={EXTRA_BUTTONS}>
        {(_, key) => <StandardItem caption category={category} id={key} />}
      </Menu>
    </DialogWrapper>
  ) : null
}

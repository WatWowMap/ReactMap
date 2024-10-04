import * as React from 'react'
import Grid2 from '@mui/material/Unstable_Grid2'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'
import { basicEqualFn, useMemory } from '@store/useMemory'
import { useLayoutStore } from '@store/useLayoutStore'
import { useStorage, useDeepStore } from '@store/useStorage'
import { Img } from '@components/Img'
import { DualBoolToggle } from '@components/inputs/BoolToggle'
import { ENABLED_ALL } from '@assets/constants'
import { Header } from '@components/dialogs/Header'
import { Footer, FooterButton } from '@components/dialogs/Footer'
import { StatusIcon } from '@components/StatusIcon'

import { DialogWrapper } from '../dialogs/DialogWrapper'

import { Size } from './Size'

export function SlotSelection() {
  const [id, teamId, open] = useLayoutStore((s) => {
    const team = s.slotSelection.slice(1).split('-', 1)[0]

    return [s.slotSelection, team, !!s.slotSelection]
  }, basicEqualFn)
  const slots = useMemory(
    (s) =>
      Object.keys(s.filters?.gyms?.filter || {}).filter(
        (g) => g.startsWith('g') && g.charAt(1) === teamId,
      ),
    basicEqualFn,
  )
  const disabled = useStorage((s) => !!s.filters?.gyms?.filter?.[id]?.all)

  const handleSizeChange: (
    value: boolean | import('@rm/types').BaseFilter['size'],
    team: string,
  ) => void = React.useCallback(
    (value, team) => {
      useStorage.setState((prev) => {
        const slotsObj = { ...prev.filters.gyms.filter }

        if (typeof value === 'boolean') {
          slotsObj[team] = { ...slotsObj[team], enabled: value }
          slots.forEach(
            (slot) => (slotsObj[slot] = { ...slotsObj[slot], enabled: value }),
          )
        } else {
          slotsObj[team] = { ...slotsObj[team], size: value }
          slots.forEach(
            (slot) => (slotsObj[slot] = { ...slotsObj[slot], size: value }),
          )
        }

        return {
          filters: {
            ...prev.filters,
            gyms: { ...prev.filters.gyms, filter: { ...slotsObj } },
          },
        }
      })
    },
    [slots],
  )

  const handleClose = React.useCallback(
    () => useLayoutStore.setState({ slotSelection: '' }),
    [],
  )

  const footerOptions: FooterButton[] = React.useMemo(
    () => [
      {
        name: 'disable_all',
        action: () => handleSizeChange(false, id),
        color: 'error',
        disabled: teamId === '0',
      },
      {
        name: 'enable_all',
        action: () => handleSizeChange(true, id),
        color: 'success',
        disabled: teamId === '0',
      },
      {
        name: 'close',
        action: handleClose,
        color: 'secondary',
      },
    ],
    [id, teamId, handleSizeChange, handleClose],
  )

  return (
    <DialogWrapper open={open} onClose={handleClose}>
      <Header
        action={handleClose}
        titles={[`team_${teamId}`, 'slot_selection']}
      />
      <DialogContent>
        <Grid2 container alignItems="center" justifyContent="center" pt={2}>
          <SlotAdjustor
            id={id}
            onClick={(_, newValue) => handleSizeChange(newValue, id)}
          />
          <Grid2 sm={6} xs={12}>
            <DualBoolToggle
              field={`filters.gyms.filter.${id}`}
              items={ENABLED_ALL}
              secondColor="success"
              switchColor="secondary"
              sx={{ pt: { xs: 2, sm: 1 } }}
            />
          </Grid2>
        </Grid2>
        {teamId !== '0' && <Divider sx={{ mt: 2 }} />}
        <Grid2 container alignItems="center" justifyContent="center">
          {teamId !== '0' &&
            slots.map((each) => (
              <SlotAdjustor key={each} id={each}>
                <Grid2 xs={2}>
                  <Enabled disabled={disabled} id={each} />
                </Grid2>
              </SlotAdjustor>
            ))}
        </Grid2>
      </DialogContent>
      <Footer options={footerOptions} />
    </DialogWrapper>
  )
}

function SlotAdjustor({
  id,
  children,
  onClick,
}: {
  id: string
  children?: React.ReactNode
  onClick?: import('./Size').SizeOnClick
}) {
  const icon = useMemory((s) =>
    s.Icons.getGyms(...(id.slice(1).split('-') as [string, string])),
  )

  return (
    <Grid2 container alignItems="center" pt={{ xs: 2, sm: 1 }} sm={6} xs={12}>
      <Grid2 xs={2}>
        <Img alt={id} maxHeight={50} maxWidth={50} src={icon} />
      </Grid2>
      <Grid2 xs={children ? 8 : 10}>
        <Size noLabel field={`filters.gyms.filter.${id}`} onClick={onClick} />
      </Grid2>
      {children}
    </Grid2>
  )
}

/**
 *
 * @param {{ id: string, disabled?: boolean }} props
 * @returns
 */
function Enabled({ id, disabled }: { id: string; disabled?: boolean }) {
  const [filter, setFilter] = useDeepStore(
    `filters.gyms.filter.${id}.enabled`,
    false,
  )

  return (
    <IconButton
      disabled={disabled}
      size="large"
      onClick={() => setFilter((prev) => !prev)}
    >
      <StatusIcon
        checkColor={disabled ? 'disabled' : 'success'}
        status={filter}
      />
    </IconButton>
  )
}

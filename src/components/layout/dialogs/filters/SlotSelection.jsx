// @ts-check
import * as React from 'react'
import Clear from '@mui/icons-material/Clear'
import Check from '@mui/icons-material/Check'
import Grid2 from '@mui/material/Unstable_Grid2/Grid2'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'

import {
  basicEqualFn,
  useDeepStore,
  useLayoutStore,
  useStatic,
  useStore,
} from '@hooks/useStore'
import { Img } from '@components/layout/general/Img'
import { DualBoolToggle } from '@components/layout/drawer/BoolToggle'
import { ENABLED_ALL } from '@assets/constants'
import Header from '@components/layout/general/Header'
import Footer from '@components/layout/general/Footer'
import Size from './Size'

import { DialogWrapper } from '../DialogWrapper'

export default function SlotSelection() {
  const [id, teamId, open] = useLayoutStore((s) => {
    const team = s.slotSelection.slice(1).split('-', 1)[0]
    return [s.slotSelection, team, !!s.slotSelection]
  }, basicEqualFn)
  const slots = useStatic(
    (s) =>
      Object.keys(s.filters.gyms.filter).filter(
        (g) => g.startsWith('g') && g.charAt(1) === teamId,
      ),
    basicEqualFn,
  )
  const disabled = useStore((s) => s.filters.gyms.filter[id]?.all)

  /** @type {(value: boolean | import('packages/types/lib').BaseFilter['size'], team: string) => void} */
  const handleSizeChange = React.useCallback(
    (value, team) => {
      useStore.setState((prev) => {
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

  const footerOptions = React.useMemo(
    () =>
      /** @type {import('@components/layout/general/Footer').FooterButton[]} */ ([
        {
          name: 'disable_all',
          action: () => handleSizeChange(false, id),
          color: 'error',
          icon: 'Clear',
          size: 2,
          disabled: teamId === '0',
        },
        {
          name: 'enable_all',
          action: () => handleSizeChange(true, id),
          color: 'success',
          icon: 'Check',
          size: 2,
          disabled: teamId === '0',
        },
        {
          name: 'save',
          action: handleClose,
          color: 'secondary',
          icon: 'Save',
          size: 2,
        },
      ]),
    [id, teamId, handleSizeChange, handleClose],
  )

  return (
    <DialogWrapper open={open} onClose={handleClose}>
      <Header
        titles={[`team_${teamId}`, 'slot_selection']}
        action={handleClose}
      />
      <DialogContent>
        <Grid2 container pt={2} alignItems="center" justifyContent="center">
          <SlotAdjustor
            id={id}
            onClick={(_, newValue) => handleSizeChange(newValue, id)}
          />
          <Grid2 xs={12} sm={6}>
            <DualBoolToggle
              items={ENABLED_ALL}
              field={`filters.gyms.filter.${id}`}
              switchColor="secondary"
              secondColor="success"
            />
          </Grid2>
        </Grid2>
        {teamId !== '0' && <Divider sx={{ my: 1 }} />}
        <Grid2 container justifyContent="center" alignItems="center">
          {teamId !== '0' &&
            slots.map((each) => (
              <SlotAdjustor key={each} id={each}>
                <Grid2 xs={2}>
                  <Enabled id={each} disabled={disabled} />
                </Grid2>
              </SlotAdjustor>
            ))}
        </Grid2>
      </DialogContent>
      <Footer options={footerOptions} />
    </DialogWrapper>
  )
}

/**
 *
 * @param {{ id: string, children?: React.ReactNode, onClick?: import('./Size').SizeOnClick }} props
 * @returns
 */
function SlotAdjustor({ id, children, onClick }) {
  const icon = useStatic((s) => s.Icons.getGyms(...id.slice(1).split('-')))
  return (
    <Grid2 container xs={12} sm={6} alignItems="center">
      <Grid2 xs={2}>
        <Img src={icon} maxHeight={50} maxWidth={50} alt={id} />
      </Grid2>
      <Grid2 xs={children ? 8 : 10}>
        <Size field={`filters.gyms.filter.${id}`} noLabel onClick={onClick} />
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
function Enabled({ id, disabled }) {
  const [filter, setFilter] = useDeepStore(
    `filters.gyms.filter.${id}.enabled`,
    false,
  )
  return (
    <IconButton
      disabled={disabled}
      onClick={() => setFilter((prev) => !prev)}
      size="large"
    >
      {filter || disabled ? (
        <Check color={disabled ? 'disabled' : 'success'} />
      ) : (
        <Clear color="error" />
      )}
    </IconButton>
  )
}

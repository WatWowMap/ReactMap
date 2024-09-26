// @ts-check
import * as React from 'react'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import Typography from '@mui/material/Typography'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'

import { useStorage } from '@store/useStorage'

const expandIcon = <ExpandMoreIcon />

/**
 * A basic accordion component that already has the expand icon and state management
 * @param {{
 *  stateKey?: string
 *  title: string
 *  children: React.ReactNode
 * } & import('@mui/material').AccordionDetailsProps} props
 * @returns
 */
export function BasicAccordion({
  title,
  stateKey = title,
  children,
  ...props
}) {
  const expanded = useStorage((s) => !!s.expanded[stateKey])

  /** @type {(e: unknown, isExpanded: boolean )=> void} */
  const handleChange = React.useCallback(
    (_, isExpanded) =>
      useStorage.setState((prev) => ({
        expanded: { ...prev.expanded, [stateKey]: isExpanded },
      })),
    [stateKey],
  )
  return (
    <Accordion expanded={expanded} onChange={handleChange}>
      <AccordionSummary expandIcon={expandIcon}>
        <Typography variant="h6">{title}</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 0 }} {...props}>
        {children}
      </AccordionDetails>
    </Accordion>
  )
}

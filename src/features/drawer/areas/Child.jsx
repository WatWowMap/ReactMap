// @ts-check
import * as React from 'react'
import Typography from '@mui/material/Typography'
import TableCell from '@mui/material/TableCell'
import Checkbox from '@mui/material/Checkbox'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import Grid2 from '@mui/material/Unstable_Grid2'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useMap } from 'react-leaflet'

import { useDeepStore, useStorage } from '@store/useStorage'
import { useMemory } from '@store/useMemory'

/**
 * @param {{
 *  name?: string
 *  feature?: Pick<import('@rm/types').RMFeature, 'properties'>
 *  allAreas?: string[]
 *  childAreas?: Pick<import('@rm/types').RMFeature, 'properties'>[]
 *  allChildAreas?: Pick<import('@rm/types').RMFeature, 'properties'>[]
 *  borderRight?: boolean
 *  colSpan?: number
 * }} props
 */
export function AreaChild({
  name,
  feature,
  childAreas,
  allChildAreas,
  allAreas,
  borderRight,
  colSpan = 1,
}) {
  const scanAreas = useStorage((s) => s.filters?.scanAreas?.filter?.areas)
  const zoom = useMemory((s) => s.config.general.scanAreasZoom)
  const expandAllScanAreas = useMemory((s) => s.config.misc.expandAllScanAreas)
  const map = useMap()

  const { setAreas } = useStorage.getState()
  const [open, setOpen] = useDeepStore('scanAreasMenu', '')

  if (!scanAreas) return null

  const allSelectableChildren = (allChildAreas || childAreas || []).filter(
    (child) => !child.properties.manual,
  )
  const hasSelectableChildren = !!name && allSelectableChildren.length > 0
  const allChildrenManual =
    name &&
    !!(allChildAreas || childAreas || []).length &&
    (allChildAreas || childAreas || []).every(
      (child) => child.properties.manual,
    )
  const hasManual = !!feature?.properties?.manual || allChildrenManual
  const areaKey = feature?.properties?.key
  const checked = !!areaKey && scanAreas.includes(areaKey)
  const showCheckbox =
    !!areaKey &&
    !!feature?.properties?.name &&
    !hasManual &&
    !hasSelectableChildren

  const nameProp =
    name || feature?.properties?.formattedName || feature?.properties?.name
  const hasExpand = name && !expandAllScanAreas && !!childAreas?.length
  return (
    <TableCell
      colSpan={colSpan}
      sx={(theme) => ({
        bgcolor: theme.palette.background.paper,
        p: 0,
        borderRight: borderRight ? 1 : 'inherit',
        borderColor:
          theme.palette.grey[theme.palette.mode === 'dark' ? 800 : 200],
      })}
    >
      <Grid2
        container
        alignItems="center"
        justifyContent="space-between"
        component={Button}
        fullWidth
        borderRadius={0}
        variant="text"
        color="inherit"
        size="small"
        wrap="nowrap"
        onClick={() => {
          if (feature?.properties?.center) {
            map.flyTo(
              feature.properties.center,
              feature.properties.zoom || zoom,
            )
          }
        }}
        sx={(theme) => ({
          py: name ? 'inherit' : 0,
          minHeight: 36,
          textTransform: 'none',
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
          },
        })}
      >
        {showCheckbox ? (
          <Checkbox
            size="small"
            color="secondary"
            checked={checked}
            onClick={(e) => e.stopPropagation()}
            onChange={() => {
              setAreas(areaKey, allAreas, checked)
            }}
            sx={{
              p: 1,
            }}
          />
        ) : null}
        <Typography
          variant={name ? 'h6' : 'caption'}
          align="center"
          style={{ whiteSpace: 'pre-wrap', flexGrow: 1 }}
        >
          {nameProp || <>&nbsp;</>}
        </Typography>
        {hasExpand && (
          <IconButton
            component="span"
            className={open === name ? 'expanded' : 'collapsed'}
            onClick={(e) => {
              e.stopPropagation()
              return setOpen((prev) => (prev === name ? '' : name))
            }}
          >
            <ExpandMoreIcon />
          </IconButton>
        )}
      </Grid2>
    </TableCell>
  )
}

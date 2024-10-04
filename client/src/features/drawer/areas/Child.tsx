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

export function AreaChild({
  name,
  feature,
  childAreas,
  allAreas,
  borderRight,
  colSpan = 1,
}: {
  name?: string
  feature?: Pick<import('@rm/types').RMFeature, 'properties'>
  allAreas?: string[]
  childAreas?: Pick<import('@rm/types').RMFeature, 'properties'>[]
  borderRight?: boolean
  colSpan?: number
}) {
  const scanAreas = useStorage((s) => s.filters?.scanAreas?.filter?.areas)
  const zoom = useMemory((s) => s.config.general.scanAreasZoom)
  const expandAllScanAreas = useMemory((s) => s.config.misc.expandAllScanAreas)
  const map = useMap()

  const { setAreas } = useStorage.getState()
  const [open, setOpen] = useDeepStore('scanAreasMenu', '')

  if (!scanAreas) return null

  const hasAll =
    childAreas &&
    childAreas.every(
      (c) => c.properties.manual || scanAreas.includes(c.properties.key),
    )
  const hasSome =
    childAreas && childAreas.some((c) => scanAreas.includes(c.properties.key))
  const hasManual =
    feature?.properties?.manual || childAreas.every((c) => c.properties.manual)
  const color =
    hasManual || (name ? !childAreas.length : !feature.properties.name)
      ? 'transparent'
      : 'none'

  const nameProp =
    name || feature?.properties?.formattedName || feature?.properties?.name
  const hasExpand = name && !expandAllScanAreas

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
        fullWidth
        alignItems="center"
        borderRadius={0}
        color="inherit"
        component={Button}
        justifyContent="space-between"
        size="small"
        sx={(theme) => ({
          py: name ? 'inherit' : 0,
          minHeight: 36,
          textTransform: 'none',
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
          },
        })}
        variant="text"
        wrap="nowrap"
        onClick={() => {
          if (feature?.properties?.center) {
            map.flyTo(
              feature.properties.center,
              feature.properties.zoom || zoom,
            )
          }
        }}
      >
        {!hasExpand && hasManual ? null : (
          <Checkbox
            checked={name ? hasAll : scanAreas.includes(feature.properties.key)}
            color="secondary"
            disabled={
              (name ? !childAreas.length : !feature.properties.name) ||
              hasManual
            }
            indeterminate={name ? hasSome && !hasAll : false}
            size="small"
            sx={{
              p: 1,
              color,
              '&.Mui-checked': {
                color,
              },
              '&.Mui-disabled': {
                color,
              },
            }}
            onChange={() =>
              setAreas(
                name
                  ? childAreas.map((c) => c.properties.key)
                  : feature.properties.key,
                allAreas,
                name ? hasSome : false,
              )
            }
            onClick={(e) => e.stopPropagation()}
          />
        )}
        <Typography
          align="center"
          style={{ whiteSpace: 'pre-wrap', flexGrow: 1 }}
          variant={name ? 'h6' : 'caption'}
        >
          {nameProp || <>&nbsp;</>}
        </Typography>
        {hasExpand && (
          <IconButton
            className={open === name ? 'expanded' : 'collapsed'}
            component="span"
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

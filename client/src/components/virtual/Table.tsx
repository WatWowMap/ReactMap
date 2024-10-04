import * as React from 'react'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import { TableComponents, TableVirtuoso } from 'react-virtuoso'

const COMPONENTS: TableComponents = {
  Scroller: React.forwardRef((props, ref) => (
    <TableContainer component={Paper} {...props} ref={ref} />
  )),
  Table: (props) => (
    <Table
      {...props}
      sx={{ borderCollapse: 'separate', tableLayout: 'fixed' }}
    />
  ),
  TableHead: React.forwardRef((props, ref) => (
    <TableHead {...props} ref={ref} />
  )),
  TableRow: ({ item: _, ...props }) => <TableRow {...props} />,
  TableBody: React.forwardRef((props, ref) => (
    <TableBody {...props} ref={ref} />
  )),
}

COMPONENTS.Scroller.displayName = 'Scroller'
COMPONENTS.Table.displayName = 'Table'
COMPONENTS.TableHead.displayName = 'TableHead'
COMPONENTS.TableRow.displayName = 'TableRow'
COMPONENTS.TableBody.displayName = 'TableBody'

export function VirtualTable<D, C>(
  props: import('react-virtuoso').TableVirtuosoProps<D, C>,
) {
  return <TableVirtuoso components={COMPONENTS} {...props} />
}

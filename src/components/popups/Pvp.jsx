import React from 'react'
import Table from '@material-ui/core/Table'
import TableBody from '@material-ui/core/TableBody'
import TableCell from '@material-ui/core/TableCell'
import TableContainer from '@material-ui/core/TableContainer'
import TableHead from '@material-ui/core/TableHead'
import TableRow from '@material-ui/core/TableRow'
import Paper from '@material-ui/core/Paper'
import { useStore, useMasterfile } from '../../hooks/useStore'
import Utility from '../../services/Utility'

export default function getPvpRanks({ league, data }) {
  if (data === null) return ''

  const { path } = useStore(state => state.settings).icons
  const availableForms = useMasterfile(state => state.availableForms)

  const rows = data.map(eachRank => ({
    img: <img src={`${path}/${Utility.getPokemonIcon(availableForms, eachRank.pokemon, eachRank.form, eachRank.evolution, eachRank.gender, eachRank.costume)}.png`} height={20} />,
    rank: eachRank.rank || 0,
    cp: eachRank.cp || 0,
    lvl: eachRank.level || 0,
  }))

  return (
    <TableContainer component={Paper}>
      <Table size="small" aria-label="a dense table" padding="none" style={{ width: 180, padding: 0 }}>
        <TableHead>
          <TableRow>
            <TableCell style={{ width: 'max-content' }}><img src={`/images/misc/${league}.png`} height={20} /></TableCell>
            <TableCell align="right" style={{ width: 'max-content' }}>Rank</TableCell>
            <TableCell align="right" style={{ width: 'max-content' }}>CP</TableCell>
            <TableCell align="right" style={{ width: 'max-content' }}>Lvl</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.rank}>
              <TableCell component="th" scope="row" style={{ width: 'max-content' }}>
                {row.img}
              </TableCell>
              <TableCell align="right" style={{ width: 'max-content' }}>{row.rank}</TableCell>
              <TableCell align="right" style={{ width: 'max-content' }}>{row.cp}</TableCell>
              <TableCell align="right" style={{ width: 'max-content' }}>{row.lvl}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

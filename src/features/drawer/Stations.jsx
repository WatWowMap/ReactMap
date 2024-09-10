// @ts-check
import * as React from 'react'
import Box from '@mui/material/Box'
// import ListItem from '@mui/material/ListItem'
// import ListItemText from '@mui/material/ListItemText'
// import MenuItem from '@mui/material/MenuItem'
// import { useTranslation } from 'react-i18next'

// import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
// import { FCSelect } from '@components/inputs/FCSelect'

import { CollapsibleItem } from './components/CollapsibleItem'
import { SelectorListMemo } from './components/SelectorList'

// function StationLevels() {
//   const { t } = useTranslation()
//   const available = useMemory((s) => s.available.stations)
//   const enabled = useStorage((s) => !!s.filters?.stations?.battles)
//   const [filters, setFilters] = useDeepStore(
//     'filters.stations.battleTier',
//     'all',
//   )
//   return (
//     <CollapsibleItem open={enabled}>
//       <ListItem
//         secondaryAction={
//           <FCSelect
//             value={filters}
//             fullWidth
//             size="small"
//             onChange={(e) =>
//               setFilters(e.target.value === 'all' ? 'all' : e.target.value)
//             }
//           >
//             {[
//               'all',
//               ...available
//                 .filter((x) => x.startsWith('r'))
//                 .map((y) => +y.slice(1)),
//             ].map((tier, i) => (
//               <MenuItem key={tier} dense value={tier}>
//                 {t(i ? `battle_${tier}_plural` : 'disabled')}
//               </MenuItem>
//             ))}
//           </FCSelect>
//         }
//       >
//         <ListItemText primary={t('battle_override')} />
//       </ListItem>
//     </CollapsibleItem>
//   )
// }

function StationsQuickSelect() {
  const enabled = useStorage((s) => !!s.filters?.stations?.maxBattles)
  return (
    <CollapsibleItem open={enabled}>
      <Box px={2}>
        <SelectorListMemo
          category="stations"
          label="search_battles"
          height={350}
        />
      </Box>
    </CollapsibleItem>
  )
}

export function StationsDrawer() {
  return (
    <>
      {/* <StationLevels /> */}
      <StationsQuickSelect />
    </>
  )
}

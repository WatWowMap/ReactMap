import { PokemonTile as pokemon } from '@features/pokemon'
import { PokestopTile as pokestops } from '@features/pokestop/PokestopTile'
import { GymTile as gyms } from '@features/gym/GymTile'
import { DeviceTile as devices } from '@features/device/DeviceTile'
import { NestTile as nests } from '@features/nest/NestTile'
import { PortalTile as portals } from '@features/portal/PortalTile'
import { RouteTile as routes } from '@features/route/RouteTile'
import scanCells from './ScanCell'
import scanAreas from './ScanArea'
import spawnpoints from './Spawnpoint'
import submissionCells from './submissionCells/SubmissionCell'
import weather from './Weather'
import s2cells from './S2Cell'

export {
  devices,
  gyms,
  nests,
  pokemon,
  pokestops,
  portals,
  scanAreas,
  scanCells,
  submissionCells,
  spawnpoints,
  weather,
  s2cells,
  routes,
}

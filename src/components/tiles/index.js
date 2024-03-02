import { PokemonTile as pokemon } from '@features/pokemon'
import { PokestopTile as pokestops } from '@features/pokestop/PokestopTile'
import { GymTile as gyms } from '@features/gym/GymTile'
import { DeviceTile as devices } from '@features/device/DeviceTile'
import { NestTile as nests } from '@features/nest/NestTile'
import { PortalTile as portals } from '@features/portal/PortalTile'
import { RouteTile as routes } from '@features/route/RouteTile'
import { WeatherTile as weather } from '@features/weather/WeatherTile'
import { SpawnpointTile as spawnpoints } from '@features/spawnpoint/SpawnpointTile'
import { ScanCellTile as scanCells } from '@features/scanCell/ScanCellTile'
import { WayfarerTile as submissionCells } from '@features/wayfarer/WayfarerTile'
import { ScanAreaTile as scanAreas } from '../../features/scanArea/ScanAreaTile'
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

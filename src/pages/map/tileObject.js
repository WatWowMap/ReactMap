import { PokemonTile as pokemon } from '@features/pokemon'
import { PokestopTile as pokestops } from '@features/pokestop'
import { GymTile as gyms } from '@features/gym'
import { DeviceTile as devices } from '@features/device'
import { NestTile as nests } from '@features/nest'
import { PortalTile as portals } from '@features/portal'
import { RouteTile as routes } from '@features/route'
import { WeatherTile as weather } from '@features/weather'
import { SpawnpointTile as spawnpoints } from '@features/spawnpoint'
import { ScanCellTile as scanCells } from '@features/scanCell'
import { WayfarerTile as submissionCells } from '@features/wayfarer'
import { ScanAreaTile as scanAreas } from '@features/scanArea'
import { BaseCell as s2cells } from '@features/s2cell'

export const TILES = {
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

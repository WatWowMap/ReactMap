# ReactMap

## Description
 Pokemon GO Map frontend built with React. Work in progress. 

## Features 
- Pokemon IVs, PVP Stats, Moves, Levels, CP and more
- Gym & Raid Filtering
- Pokestops, Quests, Lures, & Invasions
- Devices 
- Weather 
- Portals
- Submissions Cells
- Last scanned cells
- Spawnpoints
- Discord Auth & Permission Based Viewing

## PreReqs
- NodeJS (Recommend using V12.*)
- MySQL (Must use 8.0+)
- Yarn (npm install -g yarn)

## Installation Instructions
1. Clone the repo
2. Open up the directory (`cd ReactMap`)
3. `yarn install`
4. Generate Masterfile `yarn generate`
5. Create your config (`cp server/src/configs/config.example.json server/src/configs/config.json`)
6. Run your migrations (`yarn migrate:latest`)
- This will create a `users` table, would highly recommend putting this in your manual db that has nests/portals/sessions/etc 
- A sessions table will automatically be created in the specified db after the next step, be sure you've selected the correct db in the config!
- `yarn migrate:rollback` will rollback any migrations, be sure you know what you're doing to avoid data loss!
7. `yarn start`
## Dev Instructions
1. Follow steps 1-6 above
2. Open two consoles
3. `yarn dev` in one, starts the server with nodemon
4. `yarn watch` in the other, this automatically re-compiles your bundle for faster development.

## Coming Soon
- Scan Areas
- Nests
- Translatable Text
- More precise quest popups
- Other various popups
- Device paths/polygons
- AR Quest Eligibility
- Move gym slots into advanced gym menu for each team
- Stardust and other item support
- Filter all Quests/Raids/Invasions instead of only available
- Fix stretched markers
- Iconhtml to reduce double markers
- Built in event viewer
- Expand the help modals
- Import/Export buttons
- Custom Favicon Support
- Adjustable icon sizes
- Persist some menu selections
- Category headers in filter menus
- Add tutorial Popups
- Glowing Pokemon

## Credits
- [MapJS](https://github.com/WatWowMap/MapJS)
- [PMSF](https://github.com/pmsf/pmsf)
- Especially [@Versx](https://github.com/versx)

_This repository is purely for educational purposes._
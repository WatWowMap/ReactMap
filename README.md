# ReactMap

## Description
 Pokemon GO Map frontend built with React. Work in progress. 

## Features 
- View and Filter Pokemon 
- Gyms & Raids (Filtering coming soon!)
- Pokestops, Quests, & Invasions (Filtering coming soon!)
- Devices 
- Weather 
- Portals
- Submissions Cells
- Last scanned cells
- Spawnpoints
## PreReqs
- NodeJS (Recommend using V14.*)
- MySQL (Recommend using 8.0+)
- Yarn (npm install -g yarn)

## Installation Instructions
1. Clone the repo
2. Open up the directory (`cd ReactMap`)
3. `yarn install`
4. Generate Masterfile `yarn generate`
5. Create your config (`cp server/src/configs/config.example.json server/src/configs/config.json`)
6. `yarn start`
## Dev Instructions
1. Follow steps 1-5 above
2. Open two consoles
3. `yarn dev` in one, starts the server with nodemon
4. `yarn watch` in the other, this automatically re-compiles your bundle for faster development.

## Coming Soon
- Searching
- Discord Login
- User Profile/Control Panel

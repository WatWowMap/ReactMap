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
- Nests (Only compatible with latest [NestWatcher](https://github.com/M4d40/nestwatcher))
- Submissions Cells
- Last Scanned Cells
- Spawnpoints
- Discord Auth & Permission Based Viewing

## PreReqs
- NodeJS (Recommend using V12.*)
- MySQL (Only 8.0+ has been tested)
- Or MariaDB (10.4 has been tested)
- Yarn (npm install -g yarn)

## Installation Instructions
1. Clone the repo
2. Open up the directory (`cd ReactMap`)
3. `yarn install`
4. Create your config (`cp server/src/configs/config.example.json server/src/configs/config.json`)
- There are additional configs options available in `server/src/configs/default.json` that can be utilized by copying them over into your config file. Be sure to maintain the same object structure when copying options over
5. (Optional) You can add an `areas.json` file in the configs folder that's in the GeoJSON format (see `areas.example.json` for the format) for your users to be able to visualize your currently scanned areas.
6. Run your migrations (`yarn migrate:latest`)
- This will create a `users` table, would recommend putting this in your manual db that has nests/portals/sessions/etc 
- A sessions table will automatically be created in the specified db after the next step, be sure you've selected the correct db in the config!
- `yarn migrate:rollback` will rollback any migrations, be sure you know what you're doing to avoid data loss!
7. `yarn start`
## Dev Instructions
1. Follow steps 1-6 above
2. Open two consoles
3. `yarn dev` in one, starts the server with nodemon
4. `yarn watch` in the other, this automatically re-compiles your bundle for faster development.
- `yarn generate` if you want to experiment with the masterfile generator
- `yarn build` to only build and not run the server
- `yarn server` to only start the server without recompiling webpack
- `yarn console` repl server for running code/playing with the ORM
- `yarn migrate:make addNewFeature` to generate a new migration file called 'addNewFeature'

## PM2 Ecosystem Sample
You can copy and paste the following code into an existing PM2 ecosystem file or start a new one with `touch ecosystem.config.js`.
```js
module.exports = {
  apps: [
    {
      name: 'ReactMap',
      script: 'yarn run server',
      cwd: '/home/user/ReactMap/',
      instances: 1,
      autorestart: true,
      watch: ['configs/'],
      max_memory_restart: '1G',
      out_file: 'NULL',
    }
  ]
}
```
Then while you're in the same directory as the ecosystem file, `pm2 start ecosystem.config.js`
## Updating
1. `git pull`
2. `yarn install`

Without PM2:

3. `yarn start`

With PM2:

3. `yarn build`
4. `pm2 restart ReactMap`

## Additional Info
- Webhook URL Format: `https://www.yourMapUrl.com/@/lat/lon/zom`
- Adding new locales!
  - Add/Edit your locales JSON in the `/public/base-locales` folder
  - Then generate them with `yarn create-locales`
## Coming Soon
- Translatable Text
- More precise quest popups
- AR Quest Eligibility for Stops
- Built in event viewer
- Expand the help modals
- Custom Favicon Support
- Persist some menu selections
- Category headers in filter menus
- Add tutorial Popups

## Credits
- [MapJS](https://github.com/WatWowMap/MapJS)
- [PMSF](https://github.com/pmsf/pmsf)
- Especially [@Versx](https://github.com/versx)

_This repository is purely for educational purposes._

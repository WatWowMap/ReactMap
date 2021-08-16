# ReactMap

## Description

Pokemon GO Map frontend built with React. Currently in beta testing!

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

- NodeJS (Recommend using V12+)
- MySQL (Only 8.0+ has been tested)
- Or MariaDB (10.4 has been tested)
- Yarn (npm install -g yarn)

## Backends Supported:

- [Chuck](https://github.com/WatWowMap/Chuck)
- [RealDeviceMap (RDM)](https://github.com/realdevicemap/realdevicemap)
- [Map-A-Droid (MAD)](https://github.com/Map-A-Droid/MAD)

## Installation Instructions

1. Clone the repo
2. Open up the directory (`cd ReactMap`)
3. `yarn install`
4. Create your config (`cp server/src/configs/config.example.json server/src/configs/config.json`)

- There are additional configs options available in `server/src/configs/default.json` that can be utilized by copying them over into your config file. Be sure to maintain the same object structure when copying options over.

5. (Optional) You can add an `areas.json` file in the configs folder that's in the GeoJSON format (see `areas.example.json` for the format) for your users to be able to visualize your currently scanned areas.
6. Run your migrations (`yarn migrate:latest`)

- This will create a `users` table, would recommend putting this in your manual db that has nests/portals/sessions/etc.
- A sessions table will automatically be created in the specified db after the next step, **be sure you've selected the correct db in the config.**
- `yarn migrate:rollback` will rollback any migrations, be sure you know what you're doing to avoid data loss!

7. `yarn start`

## Dev Instructions

1. Follow steps 1-6 above
2. Open two consoles
3. `yarn dev` in one, starts the server with nodemon
4. `yarn watch` in the other, this automatically re-compiles your bundle for faster development.

**The dev yarn scripts do not generate the masterfile and locales like the production scripts do, you must generate them manually using these:**

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
      name: "ReactMap",
      script: "yarn run server",
      cwd: "/home/user/ReactMap/",
      instances: 1,
      autorestart: true,
      watch: ["configs/"],
      max_memory_restart: "1G",
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
```

Then while you're in the same directory as the ecosystem file, `pm2 start ecosystem.config.js`

## Docker Usage Instructions

1. Use docker-compose.yml (`cp docker-compose.example.yml docker-compose.yml`)
2. Adjust it for your usage or copy the content to your existing setup (e.g. choose different image than from main branch).
3. Run `docker-compose up -d reactmap`
4. Important: for this setup you don't need to clone the repo, you only need to create config files (`areas.json` and `config.json`) like it's mentioned in Installation Instructions. Be aware of the path to the files written in `docker-compose.yml`

## Updating

1. `git pull`
2. `yarn install`

Without PM2:

3. `yarn start`

With PM2:

3. `yarn build`
4. `pm2 restart ReactMap`

With Docker:

1. `docker-compose pull reactmap`
2. `docker-compose up -d reactmap`

If you get an error related to `yarn.lock` when pulling:
- `git checkout yarn.lock`
- `git pull`

## Additional Info

- Webhook URL lat/lon Format: `https://www.yourMapUrl.com/@/:lat/:lon/:zoom`
- Webhook URL ID Format: `https://www.yourMapUrl.com/id/:category/:id/:zoom`

ID format works for Pokemon, Gyms, Raids, Pokestops, Quests, Invasions, Lures, and Nests. ID Format also opens the popup of the item with the matching ID, assuming that it matches the users' current filters.

`:` indicates a variable and is not part of the final url. The category must be plural.

### Adding New Locales

- Add/Edit your locales JSON in the `/public/base-locales` folder
- Then generate them with `yarn create-locales`

### Glow Options

You can add any number of rules in the glow array in the config. **Be sure to add all of the keys or it will not work properly and may even cause issues.** Glow can have a drastic impact on performance, use sparingly. The name field is not translated client side, set it to whatever your locale is. The `Multiple` field is what will be displayed if a Pokemon satisfies more than one rule, modifying or removing this rule could cause issues.

```json
"glow": [
  {"name": "Hundo", "perm": "iv", "num": 100, "value": "#ff1744", "op": "=" },
  {"name": "Nundo", "perm": "iv", "num": 0, "value": "#000000", "op": "=" },
  {"name": "Top Ranks", "perm": "pvp", "num": 3, "value": "#0000ff", "op": "<=" },
  {"name": "Multiple", "perm": "pvp", "value": "#800080" }
]
```

### Multiple Database Support

- ReactMap supports any number of databases you wish to use. Simply add a new object using the same structure as the existing ones into the schema tree.
- A note on the `useFor` fields for each schema. These fields represent model names, not table names. They can be moved between schemas to accommodate any number of databases you wish to use, but they cannot be duplicated and must be spelled exactly the way they are in the config example.

### PVP Tracking

**Regardless of the backend you're using you must add which leagues you want to parse to the `leagues` array, shown below.**

```js
  "database": {
    "settings": {
      "reactMapHandlesPvp": false,
      "leagues": [
        { "name": "great", "cp": 1500 },
        { "name": "ultra", "cp": 2500 },
        { "name": "little", "cp": 500 } //<--not natively supported by RDM, must either use Chuck or set 'reactMapHandlesPvp' to true
      ],
      "pvpLevels": [50, 51] //<--only necessary when 'reactMapHandlesPvp' is set to true
    },
  }
```

- If you're using Chuck as a parser you can add any number of leagues, CP caps, and PVP level caps to the respective arrays, just be sure to add the same keys to your Chuck config.
- If you're using RDM and want more than just Great/Ultra League, you can set `reactMapHandlesPvp` to `true` and add and number of leagues, CP caps, and PVP level caps to the respective arrays.
- If you're using MAD and want PVP results you must set `reactMapHandlesPvp` to `true` and add any number of leagues, CP caps, and PVP level caps to the respective arrays

## Credits

- [MapJS](https://github.com/WatWowMap/MapJS)
- [PMSF](https://github.com/pmsf/pmsf)
- Especially [@Versx](https://github.com/versx)

_This repository is purely for educational purposes._

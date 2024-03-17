# Multi Domain Setup

## Overview
- This makes use of the `NODE_CONFIG_ENV` env variable to determine which `local.json` files to load
- Loads `default.json` => `local.json` => `local-{NODE_CONFIG_ENV}`.json
- You set all of your base defaults in `local.json` still, then set things that are unique to those domains, such `geoJsonFilename` or authentication strategies in each of the domain specifics jsons
- The `NODE_CONFIG_ENV` var names should not contain `/` or `.`

## File System
```js 
// please note that this all goes in the parent `config` folder, not this example folder
local.json
local-applemap.json
local-orangemap.json
```

## Explanation of Config Files
- `local.json` is the base config file that all other configs will inherit from, it can also be its own map instance if do not set the `NODE_CONFIG_ENV` env variable
- The other files will inherit everything you set in `local.json` and then override any values that are set in the domain specific file
- Such as in `local-applemap.json`, we have set a new title, a separate Discord strategy, and a different geoJsonFilename
- Only config setting you must set in each file is the port, since separate instances of the app will be generated
- In `local-orangemap.json`, we also set a different start Latitude and Longitude and have disabled some various features that we do not want on that map. In `local.json`, we had set `alwaysEnabledPerms = ["map"]`, however, for orangemap we have overridden that by providing an empty array. 
- The databases specified in `local.json` will be used in all 3 maps, as will all of the permissions.

## New PM2 `ecosystem.config.js` Example
```js
module.exports = {
  apps: [
    {
      name: 'ReactMap',
      script: 'ReactMap.js',
      instances: 1,
      autorestart: true,
      exec_mode: 'fork',
      max_memory_restart: '2G',
    },
    {
      name: 'AppleMap',
      script: 'ReactMap.js',
      instances: 1,
      autorestart: true,
      exec_mode: 'fork',
      max_memory_restart: '2G',
      env: {
        NODE_CONFIG_ENV: 'applemap',
      },
    },
    {
      name: 'OrangeMap',
      script: 'ReactMap.js',
      instances: 1,
      autorestart: true,
      exec_mode: 'fork',
      max_memory_restart: '2G',
      env: {
        NODE_CONFIG_ENV: 'orangemap',
      },
    },
  ],
}
```

```sh
# Start the app with the following command
pm2 start ecosystem.config.js
```

## Other Notes

- Be sure to view the `nginx` file to see how to set up the reverse proxy for the different domains
- The domains do not have to be subdomains of each other, they can be whatever you want, they are just used to differentitate the different configs
- The `NODE_CONFIG_ENV` var names should not contain `/` or `.`
- The `NODE_CONFIG_ENV` value does not have to be related to the domain its representing. The URL for the map could be `https://www.my-super-map.com` and the `NODE_CONFIG_ENV` could be `applemap` or `orangemap` or `bananamap` or whatever you want, as long as you point the nginx reverse proxy to the correct instance of the app
- Custom favicons can be set by putting the respective `{NODE_CONFIG_ENV}.ico` in the `public/favicon` folder
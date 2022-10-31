module.exports = {
  apps: [
    {
      name: 'ReactMap',
      script: 'ReactMap.js',
      instances: 1,
      autorestart: false,
      cron_restart: '*/60 */24 * * *',
      exec_mode: 'fork',
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
      },
    },
    // Advanced, comment out or remove the above block if you uncomment these two
    // {
    //   name: 'RM_Client',
    //   script: 'yarn build && yarn generate',
    //   instances: 1,
    //   autorestart: false,
    //   cron_restart: '*/60 */24 * * *',
    //   exec_mode: 'fork',
    //   max_memory_restart: '1G',
    //   env_production: {
    //     NODE_ENV: 'production',
    //   },
    // },
    // {
    //   name: 'RM_Server',
    //   script: 'server/src/index.js',
    //   instances: 4,
    //   cron_restart: '*/60 */24 * * *',
    //   exec_mode: 'cluster',
    //   autorestart: true,
    //   max_memory_restart: '4G',
    //   env_production: {
    //     NODE_ENV: 'production',
    //   },
    // },
  ],
}

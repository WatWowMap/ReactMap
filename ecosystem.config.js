module.exports = {
  apps: [
    {
      name: 'devReactMap',
      script: 'ReactMap.js',
      cwd: '/root/devReactMap2/ReactMap',
      instances: 1,
      cron_restart: '*/60 */24 * * 0',
      exec_mode: 'cluster',
      autorestart: true,
      max_memory_restart: '4G',
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
}

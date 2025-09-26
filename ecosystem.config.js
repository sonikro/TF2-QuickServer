module.exports = {
  apps: [
    {
      name: 'discord-bot',
      script: './src/index.js',
      cwd: '/app',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        HTTP_PORT: '3000'
      },
      error_file: '/app/logs/discord-bot-error.log',
      out_file: '/app/logs/discord-bot-out.log',
      log_file: '/app/logs/discord-bot.log',
      time: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'nextjs-web',
      script: 'npm',
      args: 'run start:web',
      cwd: '/app',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: '3001'
      },
      error_file: '/app/logs/nextjs-error.log',
      out_file: '/app/logs/nextjs-out.log',
      log_file: '/app/logs/nextjs.log',
      time: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M'
    }
  ]
};

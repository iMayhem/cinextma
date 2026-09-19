module.exports = {
  apps: [
    {
      name: "cinextma",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3100",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        PORT: "3100",
        SCRAPERS_BASE: "http://127.0.0.1:8080",
      },
      max_memory_restart: "800M",
      autorestart: true,
      watch: false,
      time: true,
    },
  ],
};

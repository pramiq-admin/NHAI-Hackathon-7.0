/**
 * PM2 ecosystem config for the NHAI backend.
 *
 * Single app: the FastAPI service (uvicorn worker). PM2 keeps it alive across
 * restarts, captures stdout/stderr to disk, and runs it under `cluster` mode
 * so we can scale workers without a separate gunicorn config.
 *
 * Usage:
 *   pm2 start ecosystem.config.js --env production
 *   pm2 logs nhai-api
 *   pm2 reload nhai-api      # zero-downtime reload
 *   pm2 save && pm2 startup  # boot persistence (see deploy.sh)
 */
const path = require('path');

const BACKEND_DIR = path.join(__dirname, 'backend');
const VENV_PYTHON = path.join(BACKEND_DIR, '.venv', 'bin', 'python');
const VENV_UVICORN = path.join(BACKEND_DIR, '.venv', 'bin', 'uvicorn');

module.exports = {
  apps: [
    {
      name: 'nhai-api',
      // Run uvicorn directly (not `python -m uvicorn`) so PM2's exec args
      // map cleanly to uvicorn's CLI flags.
      script: VENV_UVICORN,
      args: [
        'app.main:app',
        '--host', '0.0.0.0',
        '--port', '8000',
        // Uvicorn's own worker manager. PM2's cluster mode doesn't play
        // nicely with Python (no copy-on-write), so we let uvicorn fork.
        '--workers', '2',
        '--timeout-keep-alive', '15',
        '--proxy-headers',
        // Trust X-Forwarded-* only from the reverse proxy in front of us.
        // Replace with the actual proxy CIDR in production.
        '--forwarded-allow-ips', '127.0.0.1',
      ],
      cwd: BACKEND_DIR,
      // `fork` mode + uvicorn workers = better than PM2 cluster for Python.
      exec_mode: 'fork',
      instances: 1,
      interpreter: 'none',
      // Restart policy
      autorestart: true,
      max_restarts: 10,
      min_uptime: '30s',
      restart_delay: 2000,
      // Memory: kill + restart if RSS > 1 GB (catches embedding-cache leaks).
      max_memory_restart: '1G',
      // Logs
      out_file: path.join(BACKEND_DIR, 'logs', 'api.out.log'),
      error_file: path.join(BACKEND_DIR, 'logs', 'api.err.log'),
      merge_logs: true,
      time: true, // prepend timestamps
      // Env defaults — overridden per --env.
      env: {
        ENV: 'dev',
        PYTHONUNBUFFERED: '1',
        PYTHONDONTWRITEBYTECODE: '1',
      },
      env_production: {
        ENV: 'production',
        PYTHONUNBUFFERED: '1',
        PYTHONDONTWRITEBYTECODE: '1',
        // ⚠ Every other secret must come from backend/.env (loaded by
        // pydantic-settings inside the app). PM2's per-env block is NOT a
        // safe place for production secrets — it gets dumped by `pm2 show`.
      },
    },
  ],
};

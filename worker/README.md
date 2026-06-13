# Freeable Domains — Build Worker

A standalone Node.js worker that executes real GitHub repo builds on your own VPS. The main API server dispatches build jobs to this worker, which clones the repo, runs the install + build steps, and reports progress back via the internal API.

## Prerequisites

- **Node.js 20+** (`node --version`)
- **git** installed (`git --version`)
- Firewall allows inbound TCP on the port you choose (default `3001`)

## Setup

```bash
# 1. Clone or copy this worker directory onto your VPS
git clone https://github.com/your-org/freeable-domains.git
cd freeable-domains/worker

# 2. Install dependencies
npm install    # or: pnpm install / yarn install

# 3. Create a .env file
cat > .env <<'EOF'
PORT=3001
WORKER_SECRET=your-long-random-secret-here
API_URL=https://your-api-server.com
EOF

# 4. Start the worker
node --loader=tsx/esm src/index.ts    # dev mode (tsx must be installed)
# — or compile first and run:
npm run build && npm start
```

## Environment Variables

| Variable        | Required | Description |
|-----------------|----------|-------------|
| `WORKER_SECRET` | ✅       | Shared secret that the API server uses to authenticate requests. Must match the `WORKER_SECRET` on the API server. |
| `API_URL`       | ✅       | Base URL of the main API server (e.g. `https://api.yourdomain.com`). The worker POSTs logs and status updates here. |
| `PORT`          | —        | Port to listen on. Defaults to `3001`. |

## Configure the API Server

On the API server side, set two env vars so it knows where to send build jobs:

```
WORKER_URL=https://your-vps-ip:3001    # or your reverse-proxy URL
WORKER_SECRET=your-long-random-secret-here   # must match the worker
```

When `WORKER_URL` is absent the API server falls back to the built-in simulation — no real builds will run.

## Running with PM2 (recommended)

```bash
npm install -g pm2

# Start the worker as a managed process
pm2 start "node --loader=tsx/esm src/index.ts" --name freeable-worker

# Or start the compiled version:
npm run build
pm2 start dist/index.js --name freeable-worker

# Save process list and enable on reboot
pm2 save
pm2 startup
```

## Running with systemd

```ini
# /etc/systemd/system/freeable-worker.service
[Unit]
Description=Freeable Domains Build Worker
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/freeable-domains/worker
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
EnvironmentFile=/opt/freeable-domains/worker/.env

[Install]
WantedBy=multi-user.target
```

```bash
# Build first, then:
npm run build

systemctl daemon-reload
systemctl enable freeable-worker
systemctl start freeable-worker
systemctl status freeable-worker
```

## Running with Docker

```dockerfile
FROM node:20-slim
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY dist/ ./dist/
ENV PORT=3001
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

```bash
npm run build
docker build -t freeable-worker .
docker run -d \
  -e WORKER_SECRET=your-secret \
  -e API_URL=https://api.yourdomain.com \
  -p 3001:3001 \
  --name freeable-worker \
  freeable-worker
```

## API

### `POST /build`

Accepts a build job. Responds immediately with `202 Accepted` and processes the build asynchronously.

**Headers:** `X-Worker-Secret: <WORKER_SECRET>`

**Body:**
```json
{
  "deploymentId": 123,
  "projectId": 456,
  "repoUrl": "https://github.com/user/repo",
  "branch": "main",
  "buildCommand": "vite build",
  "framework": "React (Vite)",
  "packageManager": "npm"
}
```

### `GET /health`

Returns `200 OK` with worker status. No auth required.

## Troubleshooting

- **401 Unauthorized**: `WORKER_SECRET` on the worker doesn't match the one on the API server.
- **Worker dispatch error on API server**: Check that `WORKER_URL` is reachable from the API server (firewall, hostname, port).
- **Build fails at clone**: Ensure `git` is installed and the repo URL is publicly accessible.
- **Build fails at install**: The VPS needs internet access and the relevant runtime (Node.js / Python / etc.) in its PATH.

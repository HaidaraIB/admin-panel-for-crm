#!/bin/bash
set -euo pipefail

# IPv6 to registry.npmjs.org stalls on the prod VPS — force IPv4 resolution.
export NODE_OPTIONS=--dns-result-order=ipv4first

# Do not run `npm audit fix` here — it rewrites the dependency tree mid-deploy.
npm ci --no-audit --no-fund
npm run build
sudo systemctl reload nginx

#!/usr/bin/env bash
# Stop services on Linux server
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose down
echo "ResumePilot stopped."

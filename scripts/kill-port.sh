#!/usr/bin/env bash
# Usage: ./scripts/kill-port.sh [PORT]
# Default port: 5173

PORT="${1:-5173}"

if ! command -v lsof >/dev/null 2>&1 && ! command -v fuser >/dev/null 2>&1; then
  echo "lsof or fuser required"
  exit 1
fi

if command -v lsof >/dev/null 2>&1; then
  PIDS=$(lsof -ti tcp:"$PORT" -sTCP:LISTEN 2>/dev/null | sort -u)
else
  PIDS=$(fuser "$PORT/tcp" 2>/dev/null | tr -s ' ')
fi

if [ -z "$PIDS" ]; then
  echo "No process is listening on port $PORT."
  exit 0
fi

echo "Port $PORT listeners:"
for pid in $PIDS; do
  echo "  PID $pid"
done

read -r -p "Kill these processes? [y/N] " answer
if [[ ! "$answer" =~ ^[yY]$ ]]; then
  echo "Cancelled."
  exit 0
fi

for pid in $PIDS; do
  kill -9 "$pid" 2>/dev/null && echo "Killed PID $pid" || echo "Failed PID $pid"
done

echo "Port $PORT should now be free."

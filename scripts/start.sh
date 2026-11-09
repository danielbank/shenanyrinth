#!/bin/sh
# Build the client once, then run the server on one port, restarting it if it ever exits.
set -e
npx vite build
while true; do
  node src/server/main.ts || true
  echo "Server stopped; restarting in 1s (Ctrl+C twice to quit)"
  sleep 1
done

#!/bin/sh
set -e

MODE_FILE="/app/.run-mode"
RELOAD_FILE="/app/.run-reload"

if [ -n "${JAW4C_MODE:-}" ] && [ ! -f "$MODE_FILE" ]; then
  echo "$JAW4C_MODE" > "$MODE_FILE"
fi

if [ ! -f "$MODE_FILE" ]; then
  echo "prod" > "$MODE_FILE"
fi

while true; do
  MODE="$(cat "$MODE_FILE" 2>/dev/null | tr -d '\r\n')"

  if [ "$MODE" = "debug" ]; then
    echo "[entrypoint] Starting in debug mode"
    node --watch --inspect=0.0.0.0:9229 server.js &
  else
    echo "[entrypoint] Starting in prod mode"
    node server.js &
  fi

  PID=$!

  while kill -0 "$PID" 2>/dev/null; do
    sleep 1
    NEWMODE="$(cat "$MODE_FILE" 2>/dev/null | tr -d '\r\n')"
    if [ "$NEWMODE" != "$MODE" ]; then
      echo "[entrypoint] Mode changed to '$NEWMODE', restarting"
      kill "$PID" 2>/dev/null || true
      wait "$PID" 2>/dev/null || true
      break
    fi
    if [ -f "$RELOAD_FILE" ]; then
      echo "[entrypoint] Reload requested, restarting"
      rm -f "$RELOAD_FILE" 2>/dev/null || true
      kill "$PID" 2>/dev/null || true
      wait "$PID" 2>/dev/null || true
      break
    fi
  done

  wait "$PID" 2>/dev/null || true
done

# docker compose exec jaw4c-ui sh -c 'echo debug > /app/.run-mode'
# docker compose exec jaw4c-ui sh -c 'echo prod > /app/.run-mode'
# docker compose exec jaw4c-ui sh -c 'touch /app/.run-reload'

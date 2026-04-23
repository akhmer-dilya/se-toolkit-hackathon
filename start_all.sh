#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="$ROOT_DIR/.run"
LOG_DIR="$ROOT_DIR/logs"

BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

BACKEND_PID_FILE="$RUN_DIR/backend.pid"
FRONTEND_PID_FILE="$RUN_DIR/frontend.pid"

BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"

BACKEND_HOST="0.0.0.0"
BACKEND_PORT="8000"
FRONTEND_HOST="0.0.0.0"
FRONTEND_PORT="5173"
PUBLIC_HOST="${PUBLIC_HOST:-$(hostname -I | awk '{print $1}') }"
PUBLIC_HOST="${PUBLIC_HOST// /}"

mkdir -p "$RUN_DIR" "$LOG_DIR"

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Error: required command '$cmd' is not installed."
    exit 1
  fi
}

is_pid_running() {
  local pid="$1"
  kill -0 "$pid" >/dev/null 2>&1
}

is_service_running_from_pid_file() {
  local pid_file="$1"
  if [[ -f "$pid_file" ]]; then
    local pid
    pid="$(cat "$pid_file")"
    if [[ -n "$pid" ]] && is_pid_running "$pid"; then
      return 0
    fi
    rm -f "$pid_file"
  fi
  return 1
}

require_cmd docker
require_cmd python3
require_cmd npm

echo "[1/3] Starting PostgreSQL via docker compose..."
cd "$ROOT_DIR"
docker compose up -d

echo "[2/3] Starting backend..."
cd "$BACKEND_DIR"

if [[ ! -f ".env" && -f ".env.example" ]]; then
  cp .env.example .env
  echo "Created backend/.env from backend/.env.example"
fi

if [[ ! -d ".venv" ]]; then
  python3 -m venv .venv
fi

"$BACKEND_DIR/.venv/bin/python" -m pip install --upgrade pip >/dev/null
"$BACKEND_DIR/.venv/bin/pip" install -r requirements.txt >/dev/null
mkdir -p "$BACKEND_DIR/uploads"

echo "Applying database migrations..."
MIGRATION_LOG="$(mktemp)"
if ! (cd "$BACKEND_DIR" && "$BACKEND_DIR/.venv/bin/alembic" upgrade head) >"$MIGRATION_LOG" 2>&1; then
  cat "$MIGRATION_LOG"
  if grep -q 'relation "users" already exists' "$MIGRATION_LOG"; then
    echo
    echo "Detected legacy pre-Alembic database schema."
    echo "One-time fix (development only, resets local Postgres data):"
    echo "  docker compose down -v"
    echo "  docker compose up -d"
    echo "  bash start_all.sh"
  fi
  rm -f "$MIGRATION_LOG"
  exit 1
fi
rm -f "$MIGRATION_LOG"

if is_service_running_from_pid_file "$BACKEND_PID_FILE"; then
  echo "Backend already running (pid $(cat "$BACKEND_PID_FILE"))."
else
  nohup "$BACKEND_DIR/.venv/bin/uvicorn" app.main:app \
    --host "$BACKEND_HOST" \
    --port "$BACKEND_PORT" \
    >"$BACKEND_LOG" 2>&1 &
  echo $! > "$BACKEND_PID_FILE"
  echo "Backend started (pid $(cat "$BACKEND_PID_FILE"))."
fi

echo "[3/3] Starting frontend..."
cd "$FRONTEND_DIR"

if [[ -z "$PUBLIC_HOST" ]]; then
  PUBLIC_HOST="localhost"
fi

cat > .env <<EOF
VITE_API_URL=http://${PUBLIC_HOST}:${BACKEND_PORT}
EOF

if [[ ! -d "node_modules" ]]; then
  npm install >/dev/null
fi

if is_service_running_from_pid_file "$FRONTEND_PID_FILE"; then
  echo "Frontend already running (pid $(cat "$FRONTEND_PID_FILE"))."
else
  nohup npm run dev -- --host "$FRONTEND_HOST" --port "$FRONTEND_PORT" \
    >"$FRONTEND_LOG" 2>&1 &
  echo $! > "$FRONTEND_PID_FILE"
  echo "Frontend started (pid $(cat "$FRONTEND_PID_FILE"))."
fi

echo
echo "Services are starting in background."
echo "Backend:  http://${PUBLIC_HOST}:${BACKEND_PORT}"
echo "Frontend: http://${PUBLIC_HOST}:${FRONTEND_PORT}"
echo "Backend log:  $BACKEND_LOG"
echo "Frontend log: $FRONTEND_LOG"

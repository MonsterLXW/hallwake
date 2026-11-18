#!/usr/bin/env bash
# HALLWAKE one-command booth start (Linux/macOS; also runs under Git Bash on
# Windows). Boots backend uvicorn on 127.0.0.1 + `vite preview` of dist/ pinned
# to 127.0.0.1 (both IPv4 loopback — see deployment/README.md for the
# localhost-vs-::1 gotcha), waits for /health, prints URLs.
#
#   BACKEND_PORT=8401 FRONTEND_PORT=8402 ./deployment/start.sh
#   ./deployment/start.sh --stop
#
# Loopback-only by design (qa/security.md §7). LAN serving = deployment/booth.md.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/app/backend"
FRONTEND="$ROOT/app/frontend"
PIDFILE="$ROOT/deployment/.hallwake.pids"
BACKEND_PORT="${BACKEND_PORT:-8401}"
FRONTEND_PORT="${FRONTEND_PORT:-8402}"

if [ "${1:-}" = "--stop" ]; then
    if [ ! -f "$PIDFILE" ]; then echo "no pid file — nothing to stop"; exit 0; fi
    while IFS=: read -r pid port; do
        kill "$pid" 2>/dev/null || true
        # sweep any listener left on the port we used (wrapper processes)
        pids=$( (command -v lsof >/dev/null && lsof -ti "tcp:$port" -sTCP:LISTEN) || true )
        [ -n "$pids" ] && kill $pids 2>/dev/null || true
        echo "stopped pid $pid (port $port)"
    done < "$PIDFILE"
    rm -f "$PIDFILE"
    exit 0
fi

# pick a python: project venv (posix or Windows layout) else system python3
if [ -x "$BACKEND/.venv/bin/python" ]; then PY="$BACKEND/.venv/bin/python"
elif [ -x "$BACKEND/.venv/Scripts/python.exe" ]; then PY="$BACKEND/.venv/Scripts/python.exe"
else PY="python3"; fi

if [ -z "${HALLWAKE_SKIP_BUILD:-}" ]; then
    echo "building frontend (npm run build)..."
    (cd "$FRONTEND" && npm run build)
fi

nohup "$PY" -m uvicorn main:app --host 127.0.0.1 --port "$BACKEND_PORT" \
    >"$ROOT/deployment/backend.out.log" 2>&1 &
BE_PID=$!
( cd "$FRONTEND" && VITE_API_TARGET="http://127.0.0.1:$BACKEND_PORT" \
    nohup node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port "$FRONTEND_PORT" \
    >"$ROOT/deployment/frontend.out.log" 2>&1 & )
FE_PID=$(lsof -ti "tcp:$FRONTEND_PORT" -sTCP:LISTEN 2>/dev/null | head -1 || true)
printf '%s:%s\n%s:%s\n' "$BE_PID" "$BACKEND_PORT" "${FE_PID:-0}" "$FRONTEND_PORT" > "$PIDFILE"

for _ in $(seq 1 50); do
    if curl -fsS "http://127.0.0.1:$BACKEND_PORT/health" >/dev/null 2>&1; then break; fi
    sleep 0.5
done
echo "/health -> $(curl -fsS "http://127.0.0.1:$BACKEND_PORT/health" || echo 'NO ANSWER (see deployment/backend.out.log)')"
echo
echo "HALLWAKE running:"
echo "  game (browser):  http://localhost:$FRONTEND_PORT"
echo "  game (IPv4):     http://127.0.0.1:$FRONTEND_PORT"
echo "  api (curl):      http://127.0.0.1:$BACKEND_PORT/health   (use 127.0.0.1, NOT localhost)"
echo "  demo autopilot:  http://localhost:$FRONTEND_PORT/?auto=1&fps=1"
echo "stop with:  ./deployment/start.sh --stop"

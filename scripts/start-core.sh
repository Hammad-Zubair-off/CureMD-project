#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -z "${DOCKER_HOST:-}" && -S "${HOME}/.colima/default/docker.sock" ]]; then
  export DOCKER_HOST="unix://${HOME}/.colima/default/docker.sock"
fi

if ! docker info > /dev/null 2>&1; then
  echo "Docker is not running. Start Colima: colima start"
  exit 1
fi

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.local.yml)

echo "Starting core backend (appointment profile + local MongoDB)..."
"${COMPOSE[@]}" --profile appointment up -d --build

echo ""
echo "Waiting for services..."
sleep 8

echo ""
"${COMPOSE[@]}" ps

echo ""
echo "Health checks:"
for port in 3001 3002 3003 3004 3006; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port/health" || true)
  echo "  :$port -> $code"
done
code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health || true)
echo "  gateway :80 -> $code"

echo ""
echo "Core backend is up."
echo "Start frontend in another terminal:"
echo "  cd frontend && npm install && npm run dev"
echo "  Open http://localhost:5173"

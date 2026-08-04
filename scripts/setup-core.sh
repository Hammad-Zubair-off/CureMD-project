#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo ""
echo "================================================"
echo "  Smart Healthcare Platform — Core Setup"
echo "================================================"
echo ""

# Colima / Docker socket (Homebrew colima default)
if [[ -z "${DOCKER_HOST:-}" && -S "${HOME}/.colima/default/docker.sock" ]]; then
  export DOCKER_HOST="unix://${HOME}/.colima/default/docker.sock"
fi

if ! docker info > /dev/null 2>&1; then
  echo "ERROR: Docker is not running."
  echo "  Start Colima:  colima start"
  echo "  Or open Docker Desktop, then re-run this script."
  exit 1
fi
echo "✅ Docker is running"

# RabbitMQ env
if [[ ! -f rabbitmq.env ]]; then
  cat > rabbitmq.env <<'EOF'
RABBITMQ_DEFAULT_USER=guest
RABBITMQ_DEFAULT_PASS=guest
EOF
  echo "✅ Created rabbitmq.env"
else
  echo "⏭️  rabbitmq.env already exists"
fi

CORE_SERVICES=(
  auth-service
  patient-service
  doctor-service
  appointment-service
  notification-service
)

JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"
INTERNAL_SECRET="${INTERNAL_SECRET:-$(openssl rand -hex 32)}"
MONGO_BASE="${MONGO_BASE:-mongodb://mongo:27017}"

echo ""
echo "Setting up service .env files (local MongoDB via docker-compose.local.yml)..."

for SERVICE in "${CORE_SERVICES[@]}"; do
  EXAMPLE="services/$SERVICE/.env.example"
  TARGET="services/$SERVICE/.env"

  if [[ ! -f "$EXAMPLE" ]]; then
    echo "  ⚠️  Missing $EXAMPLE — skipped"
    continue
  fi

  if [[ -f "$TARGET" ]]; then
    echo "  ⏭️  $TARGET already exists"
    continue
  fi

  cp "$EXAMPLE" "$TARGET"

  case "$SERVICE" in
    auth-service)       DB_NAME="auth-db" ;;
    patient-service)    DB_NAME="patient_db" ;;
    doctor-service)     DB_NAME="doctor-db" ;;
    appointment-service) DB_NAME="appointment-db" ;;
    notification-service) DB_NAME="notification-db" ;;
  esac

  # Shared secrets + local Mongo
  sed -i '' "s|^MONGODB_URI=.*|MONGODB_URI=${MONGO_BASE}/${DB_NAME}|" "$TARGET" 2>/dev/null || \
    sed -i "s|^MONGODB_URI=.*|MONGODB_URI=${MONGO_BASE}/${DB_NAME}|" "$TARGET"
  sed -i '' "s|^JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" "$TARGET" 2>/dev/null || \
    sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" "$TARGET"

  # Ensure file ends with newline before appending
  [[ -n "$(tail -c1 "$TARGET" 2>/dev/null)" ]] && echo "" >> "$TARGET"

  # Append vars missing from .env.example
  grep -q '^RABBITMQ_URL=' "$TARGET" || echo "RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672" >> "$TARGET"
  grep -q '^ALLOWED_ORIGINS=' "$TARGET" || echo "ALLOWED_ORIGINS=http://localhost:5173,http://localhost:80" >> "$TARGET"

  if [[ "$SERVICE" == "appointment-service" ]]; then
    grep -q '^INTERNAL_SECRET=' "$TARGET" || echo "INTERNAL_SECRET=${INTERNAL_SECRET}" >> "$TARGET"
  fi

  if [[ "$SERVICE" == "notification-service" ]]; then
    grep -q '^MONGODB_URI=' "$TARGET" || echo "MONGODB_URI=${MONGO_BASE}/notification-db" >> "$TARGET"
    grep -q '^SENDGRID_API_KEY=' "$TARGET" || echo "SENDGRID_API_KEY=SG.localdev_placeholder_replace_with_real_key" >> "$TARGET"
    grep -q '^SENDGRID_FROM_EMAIL=' "$TARGET" || echo "SENDGRID_FROM_EMAIL=dev@example.com" >> "$TARGET"
    grep -q '^SENDGRID_FROM_NAME=' "$TARGET" || echo "SENDGRID_FROM_NAME=Healthcare Dev" >> "$TARGET"
  fi

  if [[ "$SERVICE" == "patient-service" ]]; then
    grep -q '^CLOUDINARY_CLOUD_NAME=' "$TARGET" || echo "CLOUDINARY_CLOUD_NAME=localdev" >> "$TARGET"
    grep -q '^CLOUDINARY_API_KEY=' "$TARGET" || echo "CLOUDINARY_API_KEY=localdev" >> "$TARGET"
    grep -q '^CLOUDINARY_API_SECRET=' "$TARGET" || echo "CLOUDINARY_API_SECRET=localdev" >> "$TARGET"
  fi

  echo "  ✅ Created $TARGET"
done

echo ""
echo "================================================"
echo "  Manual checklist (if using MongoDB Atlas instead)"
echo "================================================"
echo "  Replace MONGODB_URI in each services/*/.env with Atlas connection strings."
echo "  Keep JWT_SECRET identical across all core services."
echo "  appointment-service needs INTERNAL_SECRET (auto-generated if new)."
echo "  notification-service needs a real SENDGRID_API_KEY for email."
echo "  patient-service needs real Cloudinary keys for file uploads."
echo ""
echo "  Local MongoDB (default): use docker-compose.local.yml overlay."
echo "  Next: ./scripts/start-core.sh"
echo ""

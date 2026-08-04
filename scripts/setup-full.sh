#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo ""
echo "================================================"
echo "  Smart Healthcare Platform — Full Stack Setup"
echo "================================================"
echo ""

# Run core setup first (skips existing .env files)
"$ROOT_DIR/scripts/setup-core.sh"

JWT_SECRET=""
INTERNAL_SECRET=""

if [[ -f services/auth-service/.env ]]; then
  JWT_SECRET=$(grep '^JWT_SECRET=' services/auth-service/.env | cut -d= -f2-)
fi

if [[ -f services/appointment-service/.env ]]; then
  INTERNAL_SECRET=$(grep '^INTERNAL_SECRET=' services/appointment-service/.env | cut -d= -f2-)
fi

if [[ -z "$JWT_SECRET" ]]; then
  JWT_SECRET=$(openssl rand -hex 32)
fi

if [[ -z "$INTERNAL_SECRET" ]]; then
  INTERNAL_SECRET=$(openssl rand -hex 32)
fi

MONGO_BASE="${MONGO_BASE:-mongodb://mongo:27017}"
STRIPE_PK="${STRIPE_PK:-pk_test_localdev_replace_with_real_key}"
STRIPE_SK="${STRIPE_SK:-sk_test_localdev_replace_with_real_key}"
STRIPE_WH="${STRIPE_WH:-whsec_localdev_replace_with_real_secret}"
AGORA_ID="${AGORA_ID:-localdev_replace_with_real_app_id}"
AGORA_CERT="${AGORA_CERT:-localdev_replace_with_real_certificate}"
GEMINI_KEY="${GEMINI_KEY:-localdev_replace_with_real_gemini_key}"

DEFERRED_SERVICES=(
  payment-service
  telemedicine-service
  ai-symptom-service
)

echo ""
echo "Setting up deferred service .env files..."

for SERVICE in "${DEFERRED_SERVICES[@]}"; do
  TARGET="services/$SERVICE/.env"

  if [[ -f "$TARGET" ]]; then
    echo "  ⏭️  $TARGET already exists"
    continue
  fi

  case "$SERVICE" in
    payment-service)
      cat > "$TARGET" <<EOF
PORT=3005
SERVICE_NAME=payment
MONGODB_URI=${MONGO_BASE}/payment-db
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:80
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
INTERNAL_SECRET=${INTERNAL_SECRET}
STRIPE_SECRET_KEY=${STRIPE_SK}
STRIPE_WEBHOOK_SECRET=${STRIPE_WH}
EOF
      ;;
    telemedicine-service)
      cat > "$TARGET" <<EOF
PORT=3007
SERVICE_NAME=telemedicine
MONGODB_URI=${MONGO_BASE}/telemedicine-db
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:80
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
AGORA_APP_ID=${AGORA_ID}
AGORA_APP_CERTIFICATE=${AGORA_CERT}
FRONTEND_URL=http://localhost:5173
EOF
      ;;
    ai-symptom-service)
      cat > "$TARGET" <<EOF
PORT=3008
SERVICE_NAME=ai_symptoms
MONGODB_URI=${MONGO_BASE}/ai_symptoms
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:80
GEMINI_API_KEY=${GEMINI_KEY}
EOF
      ;;
  esac

  echo "  ✅ Created $TARGET"
done

FRONTEND_ENV="frontend/.env"
if [[ ! -f "$FRONTEND_ENV" ]]; then
  cat > "$FRONTEND_ENV" <<EOF
VITE_STRIPE_PUBLIC_KEY=${STRIPE_PK}
EOF
  echo "  ✅ Created $FRONTEND_ENV"
else
  echo "  ⏭️  $FRONTEND_ENV already exists"
fi

echo ""
echo "================================================"
echo "  Full stack setup complete"
echo "================================================"
echo "  Replace placeholder API keys in:"
echo "    services/payment-service/.env"
echo "    services/telemedicine-service/.env"
echo "    services/ai-symptom-service/.env"
echo "    frontend/.env"
echo ""
echo "  Next: docker compose -f docker-compose.yml -f docker-compose.local.yml --profile full up -d --build"
echo ""

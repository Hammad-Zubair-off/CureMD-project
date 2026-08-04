#!/usr/bin/env bash
# Bootstrap a local superadmin (and optional admin) for dev.
# Safe to re-run — skips if email already exists.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SUPERADMIN_EMAIL="${SUPERADMIN_EMAIL:-superadmin@medicare.com}"
SUPERADMIN_PASSWORD="${SUPERADMIN_PASSWORD:-Admin1!}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@medicare.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin1!}"

MONGO_CONTAINER="${MONGO_CONTAINER:-healthcare-mongo}"
AUTH_CONTAINER="${AUTH_CONTAINER:-auth-service}"

if ! docker ps --format '{{.Names}}' | grep -qx "$MONGO_CONTAINER"; then
  echo "Error: MongoDB container '$MONGO_CONTAINER' is not running."
  echo "Start the stack first: docker compose -f docker-compose.yml -f docker-compose.local.yml --profile full up -d"
  exit 1
fi

hash_password() {
  local password="$1"
  docker exec "$AUTH_CONTAINER" node -e \
    "import('bcryptjs').then(b => b.default.hash(process.argv[1], 12).then(h => process.stdout.write(h)))" \
    "$password"
}

insert_user() {
  local email="$1"
  local password="$2"
  local role="$3"
  local first="$4"
  local last="$5"

  local exists
  exists=$(docker exec "$MONGO_CONTAINER" mongosh auth-db --quiet --eval \
    "db.users.countDocuments({email:'$email'})")

  if [ "$exists" != "0" ]; then
    echo "Skip: $email already exists (role unchanged)."
    return 0
  fi

  local hash
  hash=$(hash_password "$password")

  docker exec "$MONGO_CONTAINER" mongosh auth-db --quiet --eval "
    db.users.insertOne({
      firstName: '$first',
      lastName: '$last',
      email: '$email',
      password: '$hash',
      role: '$role',
      isActive: true,
      isApproved: true,
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    })
  " >/dev/null

  echo "Created $role: $email"
}

echo "Seeding local admin accounts..."
insert_user "$SUPERADMIN_EMAIL" "$SUPERADMIN_PASSWORD" "superadmin" "Super" "Admin"
insert_user "$ADMIN_EMAIL" "$ADMIN_PASSWORD" "admin" "Platform" "Admin"
echo ""
echo "Login at http://localhost:5173/login then open http://localhost:5173/admin"
echo ""
echo "  Superadmin: $SUPERADMIN_EMAIL / $SUPERADMIN_PASSWORD"
echo "  Admin:      $ADMIN_EMAIL / $ADMIN_PASSWORD"

#!/usr/bin/env bash
# Verifies frontend dev server + Vite /api proxy (same path the browser uses)
set -euo pipefail

FE_PORT="${FE_PORT:-5173}"
BASE="http://localhost:$FE_PORT"
TS=$(date +%s)
EMAIL="fe-patient$TS@example.com"

echo "== Frontend root =="
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/")
[[ "$code" == "200" ]] || { echo "Frontend not reachable on $BASE"; exit 1; }
echo "OK ($code)"

echo "== Register via Vite proxy =="
REG=$(curl -s -X POST "$BASE/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"firstName\":\"FE\",\"lastName\":\"Patient\",\"email\":\"$EMAIL\",\"password\":\"Password123!\",\"role\":\"patient\"}")
echo "$REG" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['success']; print('register OK')"

echo "== Login via Vite proxy =="
LOGIN=$(curl -s -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"Password123!\"}")
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
echo "login OK"

echo "== List doctors via Vite proxy =="
DOCS=$(curl -s "$BASE/api/doctors" -H "Authorization: Bearer $TOKEN")
COUNT=$(echo "$DOCS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('data',[])))")
echo "doctors visible: $COUNT"

echo "SUCCESS: Frontend + API proxy verified on port $FE_PORT"

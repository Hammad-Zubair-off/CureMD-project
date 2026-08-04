#!/usr/bin/env bash
# End-to-end API smoke test for core booking flow
set -euo pipefail

BASE="${BASE_URL:-http://localhost}"
TS=$(date +%s)

register() {
  local role=$1 email=$2
  curl -s -X POST "$BASE/api/auth/register" \
    -H 'Content-Type: application/json' \
    -d "{\"firstName\":\"Test\",\"lastName\":\"User$TS\",\"email\":\"$email\",\"password\":\"Password123!\",\"role\":\"$role\"}"
}

echo "== Register patient =="
PATIENT_JSON=$(register patient "patient$TS@example.com")
PATIENT_TOKEN=$(echo "$PATIENT_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
echo "Patient registered OK"

echo "== Register doctor =="
DOCTOR_JSON=$(register doctor "doctor$TS@example.com")
DOCTOR_ID=$(echo "$DOCTOR_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['user']['id'])")
DOCTOR_TOKEN=$(echo "$DOCTOR_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
echo "Doctor registered OK (user id: $DOCTOR_ID)"

echo "== Approve doctor in MongoDB =="
export DOCKER_HOST="${DOCKER_HOST:-unix://$HOME/.colima/default/docker.sock}"
docker exec healthcare-mongo mongosh --quiet auth-db --eval "db.users.updateOne({email: 'doctor$TS@example.com'}, {\$set: {isApproved: true}})" | tail -1

echo "== Doctor re-login =="
DOCTOR_JSON=$(curl -s -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"doctor$TS@example.com\",\"password\":\"Password123!\"}")
DOCTOR_TOKEN=$(echo "$DOCTOR_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

echo "== Create doctor profile =="
PROFILE_JSON=$(curl -s -X POST "$BASE/api/doctors/profile" \
  -H "Authorization: Bearer $DOCTOR_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{
    \"firstName\": \"Jane\",
    \"lastName\": \"Smith\",
    \"specialization\": \"General Medicine\",
    \"yearsOfExperience\": 10,
    \"licenseNumber\": \"LIC$TS\",
    \"consultationFee\": 1500
  }")
DOCTOR_PROFILE_ID=$(echo "$PROFILE_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['_id'])")
echo "Doctor profile: $DOCTOR_PROFILE_ID"

# Tomorrow's date in ISO format
APPT_DATE=$(python3 -c "from datetime import datetime, timedelta; print((datetime.utcnow()+timedelta(days=1)).strftime('%Y-%m-%dT10:00:00.000Z'))")

echo "== Book appointment =="
BOOK_JSON=$(curl -s -X POST "$BASE/api/appointments/" \
  -H "Authorization: Bearer $PATIENT_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{
    \"doctorId\": \"$DOCTOR_PROFILE_ID\",
    \"doctorFullName\": \"Dr. Jane Smith\",
    \"specialty\": \"General Medicine\",
    \"consultationFee\": 1500,
    \"appointmentDate\": \"$APPT_DATE\",
    \"timeSlot\": \"09:00 - 09:30\",
    \"reason\": \"Routine checkup\",
    \"patientPhone\": \"0712345678\",
    \"sharingMode\": \"none\"
  }")
echo "$BOOK_JSON" | python3 -m json.tool

APPT_ID=$(echo "$BOOK_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('appointment',{}).get('_id','') or d.get('data',{}).get('_id',''))")
if [[ -z "$APPT_ID" ]]; then
  echo "FAILED: No appointment id returned"
  exit 1
fi

echo "== Fetch patient appointments (unpaid tab) =="
MY_APPTS=$(curl -s "$BASE/api/appointments/my?tab=unpaid" -H "Authorization: Bearer $PATIENT_TOKEN")
echo "$MY_APPTS" | python3 -c "import sys,json; d=json.load(sys.stdin); appts=d.get('data', d.get('appointments',[])); print('appointments:', len(appts)); assert len(appts)>=1"
echo "SUCCESS: Core booking flow verified (appointment $APPT_ID)"

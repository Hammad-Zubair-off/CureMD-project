# Vercel deployment — live status

Tracking the Render → Vercel migration rollout. Updated as each service goes live.

**Branch:** `backend` · **Vercel account:** Hammad's projects (Hobby)
**Frontend:** already deployed on Vercel (pre-migration). Phase 3 = just repoint `frontend/vercel.json` at the new backend URLs + redeploy.
**Upstash QStash:** account not created yet — needed for patient / appointment / payment / notification. Until the tokens are set, those services fall back to direct HTTP between Vercel URLs (works, but no retry/queue durability).

---

## Service checklist

All 8 projects created via Vercel CLI (`vercel link` + `vercel deploy --prod`) under team `hammads-projects-60b1d2d4`. Non-secret env vars set. Secrets (`JWT_SECRET`, `MONGODB_URI`, provider keys) pending.

| # | Service | Vercel project | Deployed | Secrets in | Peer URLs | `/health` | Status |
|---|---------|----------------|:---:|:---:|:---:|:---:|--------|
| 1 | auth | `cure-md-project` | ✅ | ✅ | n/a | **200** | **LIVE**, Mongo + JWT verified |
| 2 | patient | `curemd-patient` | ✅ | ✅ | ✅ | **200** | **LIVE**, token from auth accepted |
| 3 | doctor | `curemd-doctor` | ✅ | ✅ | n/a | **200** | **LIVE**, returns real doctor data |
| 4 | appointment | `curemd-appointment` | ✅ | ✅ | ✅ | **200** | **LIVE** |
| 5 | payment | `curemd-payment` | ✅ | ⚠️ Stripe=placeholder | ✅ | **200** | **LIVE** (real Stripe keys still needed) |
| 6 | notification | `curemd-notification` | ✅ | ✅ | n/a | **200** | **LIVE** (Brevo set) |
| 7 | telemedicine | `curemd-telemedicine` | ✅ | ✅ | ✅ | **200** | **LIVE** (Agora set) |
| 8 | ai-symptom | `curemd-ai-symptom` | ✅ | ✅ | ✅ | **200** | **LIVE** (Gemini set) |
| — | frontend | (already on Vercel) | ✅ | n/a | n/a | n/a | live; `vercel.json` repointed, **needs redeploy** + its URL for CORS |

### Verified
- All 8 `/health` → 200, MongoDB Atlas connected on each.
- Registered a test patient on `auth`; the JWT was accepted by `patient` (`/api/patients/me` → 200) and `doctor` (`/api/doctors` → 200 with real records). `JWT_SECRET` consistent across services. Garbage token → 401.
- Existing production data intact.

### FULL STACK LIVE — https://curemd-frontend.vercel.app

- Frontend deployed fresh as `curemd-frontend` (Hammad's team). `frontend/vercel.json` rewrites `/api/*` to each backend.
- `ALLOWED_ORIGINS=https://curemd-frontend.vercel.app` set on all 8; `FRONTEND_URL` set on telemedicine. All redeployed.
- Verified: frontend loads; `/api/auth/login` and `/api/doctors` proxy correctly to their services; backend returns `Access-Control-Allow-Origin: https://curemd-frontend.vercel.app`.

### QStash event layer — DONE
- `QSTASH_TOKEN` on patient / appointment / payment (publishers).
- `QSTASH_CURRENT_SIGNING_KEY` + `QSTASH_NEXT_SIGNING_KEY` on notification / appointment / payment (consumers).
- All 4 redeployed. Verified: `/api/*/events` endpoints return **401 for unsigned** requests (signature enforcement live).
- Full delivery (booking → QStash → email/SMS) verifies on a real booking through the frontend.

### Remaining (non-blocking for core use)
1. **Real Stripe keys** — deferred by user. `curemd-payment` on placeholders; `SKIP_PAYMENT=true` bypasses payments.
2. **Appointment-expiry cron** — external scheduler POSTing to `https://curemd-appointment.vercel.app/api/appointments/internal/run-expiry` with header `x-internal-secret: <INTERNAL_SECRET>`, every ~10 min (cron-job.org).
3. **Dashboard cleanup** — restore git push-to-deploy on the 7 CLI projects (rootDirectory + branch + reconnect).
4. **Merge `backend` → `main`**, retire Render.

## Live URLs

| Service | Production URL |
|---------|----------------|
| auth | `https://cure-md-project-sigma.vercel.app` |
| patient | `https://curemd-patient.vercel.app` |
| doctor | `https://curemd-doctor.vercel.app` |
| appointment | `https://curemd-appointment.vercel.app` |
| payment | `https://curemd-payment.vercel.app` |
| notification | `https://curemd-notification.vercel.app` |
| telemedicine | `https://curemd-telemedicine.vercel.app` |
| ai-symptom | `https://curemd-ai-symptom.vercel.app` |
| frontend | (existing Vercel project) |

---

## Per-service env vars

### Shared — every service gets these 5

| Name | Value |
|------|-------|
| `JWT_SECRET` | one shared secret, identical on all 8 (from Render `curemd-shared`) |
| `JWT_EXPIRES_IN` | `7d` |
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Atlas SRV string, swap the `/db-name` per service (below) |
| `ALLOWED_ORIGINS` | frontend URL — use `https://placeholder.vercel.app` until the frontend is deployed, then update all 8 |

DB names: auth `auth-db` · patient `patient_db` · doctor `doctor-db` · appointment `appointment-db` · payment `payment-db` · notification `notification-db` · telemedicine `telemedicine-db` · ai-symptom `ai_symptoms`

### 1. auth — extra
`SERVICE_NAME=auth_service`

### 2. patient — extra
```
SERVICE_NAME=patient
INTERNAL_SECRET=<shared, from Render curemd-shared>
CLOUDINARY_CLOUD_NAME=<from Render>
CLOUDINARY_API_KEY=<from Render>
CLOUDINARY_API_SECRET=<from Render>
QSTASH_TOKEN=<from Upstash QStash>
APPOINTMENT_SERVICE_URL=<appointment prod URL>     # fill in Phase 2
NOTIFICATION_SERVICE_URL=<notification prod URL>   # fill in Phase 2
```

### 3. doctor — extra
`SERVICE_NAME=doctor`

### 4. appointment — extra
```
SERVICE_NAME=appointment
INTERNAL_SECRET=<shared>
SKIP_PAYMENT=true
QSTASH_TOKEN=<from Upstash>
QSTASH_CURRENT_SIGNING_KEY=<from Upstash>
QSTASH_NEXT_SIGNING_KEY=<from Upstash>
PATIENT_SERVICE_URL=<patient prod URL>             # Phase 2
DOCTOR_SERVICE_URL=<doctor prod URL>               # Phase 2
NOTIFICATION_SERVICE_URL=<notification prod URL>   # Phase 2
PAYMENT_SERVICE_URL=<payment prod URL>             # Phase 2
```

### 5. payment — extra
```
SERVICE_NAME=payment
INTERNAL_SECRET=<shared>
STRIPE_SECRET_KEY=<from Render>
STRIPE_WEBHOOK_SECRET=<from Render, or new after Phase 3 webhook setup>
QSTASH_TOKEN=<from Upstash>
QSTASH_CURRENT_SIGNING_KEY=<from Upstash>
QSTASH_NEXT_SIGNING_KEY=<from Upstash>
APPOINTMENT_SERVICE_URL=<appointment prod URL>     # Phase 2
NOTIFICATION_SERVICE_URL=<notification prod URL>   # Phase 2
```

### 6. notification — extra
```
SERVICE_NAME=notification
BREVO_API_KEY=<from Render>
BREVO_FROM_EMAIL=<from Render>
BREVO_FROM_NAME=<from Render, e.g. CureMD>
QSTASH_CURRENT_SIGNING_KEY=<from Upstash>
QSTASH_NEXT_SIGNING_KEY=<from Upstash>
# optional SMS:
TWILIO_ACCOUNT_SID=<from Render>
TWILIO_AUTH_TOKEN=<from Render>
TWILIO_PHONE_NUMBER=<from Render>
```

### 7. telemedicine — extra
```
SERVICE_NAME=telemedicine
AGORA_APP_ID=<from Render>
AGORA_APP_CERTIFICATE=<from Render>
FRONTEND_URL=<frontend prod URL>                   # Phase 2 (join links)
TELEMEDICINE_DEV_AUTO_SESSION=true
APPOINTMENT_SERVICE_URL=<appointment prod URL>     # Phase 2
```

### 8. ai-symptom — extra
```
SERVICE_NAME=ai_symptoms
GEMINI_API_KEY=<from Render>
PATIENT_SERVICE_URL=<patient prod URL>             # Phase 2
DOCTOR_SERVICE_URL=<doctor prod URL>               # Phase 2
```

### frontend — env
```
VITE_STRIPE_PUBLIC_KEY=<pk_test_... from Render frontend>
```

---

## Peer URL values (for Phase 2 `*_SERVICE_URL` env vars)

```
PATIENT_SERVICE_URL=https://curemd-patient.vercel.app
DOCTOR_SERVICE_URL=https://curemd-doctor.vercel.app
APPOINTMENT_SERVICE_URL=https://curemd-appointment.vercel.app
PAYMENT_SERVICE_URL=https://curemd-payment.vercel.app
NOTIFICATION_SERVICE_URL=https://curemd-notification.vercel.app
```

## Phases

- [x] **Phase 0** — code migration on `backend` (verified locally)
- [~] **Phase 1** — 8 projects created + deployed via CLI; auth fully LIVE; other 7 waiting on secrets
- [ ] **Phase 1b** — add secrets (`JWT_SECRET`, per-service `MONGODB_URI`, provider keys) → redeploy → verify `/health` 200
- [ ] **Phase 2** — set peer `*_SERVICE_URL` (values above) + real `ALLOWED_ORIGINS` + telemedicine `FRONTEND_URL` on all → redeploy
- [ ] **Phase 3** — redeploy the existing frontend project (picks up the repointed `frontend/vercel.json`)
- [ ] **Phase 4** — Stripe webhook → `https://curemd-payment.vercel.app/api/payments/webhook`
- [ ] **Phase 5** — external cron → `POST https://curemd-appointment.vercel.app/api/appointments/internal/run-expiry` (header `x-internal-secret`)
- [ ] **Phase 6** — QStash: create Upstash account, add `QSTASH_TOKEN` (patient/appointment/payment) + `QSTASH_CURRENT_SIGNING_KEY`/`QSTASH_NEXT_SIGNING_KEY` (notification/appointment/payment), redeploy
- [ ] **Phase 7** — end-to-end test (register → book → check notification logs for `[events]`)
- [ ] **Phase 8** — dashboard cleanup: restore git push-to-deploy on the 7 CLI projects (see Open items)
- [ ] **Phase 9** — merge `backend` → `main`, retire Render

---

## Open items / notes

- **auth** (`cure-md-project`) is git-connected (rootDir `services/auth-service`, prod branch `backend`) → auto-deploys on push. Working.
- **The other 7** are **CLI-deployed only** — git was disconnected so a `git push` can't clobber them with junk root-level builds (the CLI `vercel link` had connected them with no rootDirectory). Redeploy any of them with:
  `cd services/<svc>-service && npx vercel deploy --prod --yes --scope hammads-projects-60b1d2d4`
- **TODO (dashboard, ~2 min each):** to restore push-to-deploy on the 7 — per project: Settings → Build and Deployment → **Root Directory** = `services/<svc>-service`; Settings → Environments → Production → **Branch** = `backend`; then Settings → Git → **Connect** `Hammad-Zubair-off/CureMD-project`. Do this after secrets are in and everything's verified. The Vercel CLI has no command for rootDirectory, and the REST API path was blocked in this environment.
- `frontend/vercel.json` now points at the real service URLs. The existing frontend project must be **redeployed** to pick it up (Phase 3).
- Preview/branch URLs (`*-<hash>-hammads-projects-*.vercel.app`) sit behind Vercel auth (302). Use the plain `curemd-<svc>.vercel.app` alias.
- `curemd-payment` returns 500 (not 503) until `STRIPE_SECRET_KEY` is set — `new Stripe(undefined)` throws at module load. Pre-existing pattern; fine once the key is in.

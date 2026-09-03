# Vercel deployment — live status

Tracking the Render → Vercel migration rollout. Updated as each service goes live.

**Branch:** `backend` · **Vercel account:** Hammad's projects (Hobby) · **Frontend:** not yet deployed

---

## Service checklist

| # | Service | Vercel project | Root Directory | Prod branch = `backend` | Env vars | `/health` 200 | DB verified | Status |
|---|---------|----------------|----------------|:---:|:---:|:---:|:---:|--------|
| 1 | auth | `cure-md-project` | `services/auth-service` | ⚠️ set it | ✅ 6/6 | ✅ | ✅ login hits Mongo | **LIVE** |
| 2 | patient | — | `services/patient-service` | — | ☐ | ☐ | ☐ | not started |
| 3 | doctor | — | `services/doctor-service` | — | ☐ | ☐ | ☐ | not started |
| 4 | appointment | — | `services/appointment-service` | — | ☐ | ☐ | ☐ | not started |
| 5 | payment | — | `services/payment-service` | — | ☐ | ☐ | ☐ | not started |
| 6 | notification | — | `services/notification-service` | — | ☐ | ☐ | ☐ | not started |
| 7 | telemedicine | — | `services/telemedicine-service` | — | ☐ | ☐ | ☐ | not started |
| 8 | ai-symptom | — | `services/ai-symptom-service` | — | ☐ | ☐ | ☐ | not started |
| — | frontend | — | `frontend` | — | ☐ | — | — | not started |

## Live URLs

| Service | Production URL |
|---------|----------------|
| auth | `https://cure-md-project-sigma.vercel.app` |
| patient | _tbd_ |
| doctor | _tbd_ |
| appointment | _tbd_ |
| payment | _tbd_ |
| notification | _tbd_ |
| telemedicine | _tbd_ |
| ai-symptom | _tbd_ |
| frontend | _tbd_ |

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

## Phases

- [x] **Phase 0** — code migration on `backend` (8 commits, verified locally)
- [ ] **Phase 1** — deploy 8 backend services (1/8 done: auth)
- [ ] **Phase 2** — cross-wire: fill peer `*_SERVICE_URL`, set real `ALLOWED_ORIGINS`/`FRONTEND_URL` on all, redeploy
- [ ] **Phase 3** — deploy frontend, put real service URLs into `frontend/vercel.json`, redeploy
- [ ] **Phase 4** — Stripe webhook → `https://<payment>/api/payments/webhook`
- [ ] **Phase 5** — external cron → `POST https://<appointment>/api/appointments/internal/run-expiry` (header `x-internal-secret`)
- [ ] **Phase 6** — end-to-end test (register → book → event delivery in notification logs)
- [ ] **Phase 7** — merge `backend` → `main`, retire Render

---

## Open items / notes

- auth project got named `cure-md-project` (the whole-repo import). Cosmetic — leave it. Name the rest `curemd-<svc>` for clarity.
- Every service needs its **Production Branch set to `backend`** in Settings → Environments → Production (needs a `backend` build to exist first — a push to `backend` creates one).
- Preview/branch URLs (`*-git-backend-*.vercel.app`) sit behind Vercel auth (302). Test the plain production domain instead.
- `frontend/vercel.json` still has placeholder hosts `curemd-<svc>-service.vercel.app` — replace with real URLs in Phase 3.

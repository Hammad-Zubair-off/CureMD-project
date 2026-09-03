# CureMD — Migration & Deployment Audit

**Project:** CureMD — AI-Enabled Smart Healthcare & Telemedicine Platform
**Migration:** Render (Docker) → Vercel (serverless); RabbitMQ → Upstash QStash
**Repository:** [Hammad-Zubair-off/CureMD-project](https://github.com/Hammad-Zubair-off/CureMD-project)
**Status:** ✅ Migration complete — merged to `main`, deployed, tested · 🔧 regression fixes merged to `main` (`c7b6eba`); 2/9 deployed, 7/9 pending Vercel daily-deploy-limit reset
**Last updated:** 2026-09-04

| | |
|---|---|
| Pre-migration `main` | `088f2e3` |
| Migration branch | `backend` (22 commits) |
| Merge commit | `e251b66` — "Merge branch 'backend': Render → Vercel migration" |
| `main` / `backend` HEAD (deployed) | `7c77746` |
| Regression fixes | branch `bugfixes` @ `6023d9e` — see §14 |
| Vercel team | `hammads-projects-60b1d2d4` ("Hammad's projects", Hobby plan) |

---

## 1. TL;DR

All 8 backend microservices and the frontend now run on **Vercel serverless functions**. The Nginx API gateway and RabbitMQ are gone. Async events go through **Upstash QStash**; appointment expiry runs via an external **cron-job.org** trigger. MongoDB Atlas is unchanged and all production data is intact. The old Render deployment still exists and can serve as a rollback until it is deleted.

Post-merge automated testing: **35 / 38 checks pass**, with **no migration defects** — the 2 non-passes were test-script input casing, and 1 was a transient Google Gemini outage (external).

---

## 2. Timeline

Times are **PKT (UTC+05:00)**. Commit rows carry their real commit timestamp; non-commit rows are approximate to within a few minutes.

### Session start & setup — 2026-09-02 (evening)

| Time | Event |
|---|---|
| ~19:30 | Session started (no project folder). User asked to locate a prior "CureMD" project — not found in Claude session history or on disk. |
| ~19:45 | User's GitHub account identified (`Ashrafitechhub`); repo not on their account. GitHub CLI (`gh` 2.98.0) authenticated after user ran `gh auth login`. |
| ~20:00 | Found **`Hammad-Zubair-off/CureMD-project`** (private, user is a collaborator). Cloned to `C:\Users\Lenovo\Desktop\CureMD-project`. Session moved into it. |
| ~20:20 | Full codebase discovery: 8 Express microservices + Nginx gateway on Render, RabbitMQ `healthcare` topic exchange, MongoDB Atlas, React/Vite frontend on Vercel. Migration plan agreed: **8 separate Vercel projects, Upstash QStash for events, Hobby plan.** Branch `backend` created off `main` (`088f2e3`). |

### Phase 0 — code migration — 2026-09-02

| Time | Commit | Work |
|---|---|---|
| 20:58 | `e4c8c37` | auth-service → serverless entrypoint (`src/app.js` + `api/index.js`), cached-connection `db.js`; `MIGRATION.md` written |
| 21:02 | `08e007f` | doctor / ai-symptom / telemedicine → same pattern; telemedicine's unused RabbitMQ wiring removed *(done via subagent)* |
| 21:08 | `fb7a68f` | **RabbitMQ → Upstash QStash** across patient / appointment / payment / notification: new `eventBus.js` (publish), `eventRoutes.js` + `qstashVerify.js` + `eventHandlers.js` (consume); `rabbitmq.js` + `amqplib` removed |
| 21:10 | `40742de` | Deleted `render.yaml`, `rabbitmq.env.example`, `k8s/rabbitmq.yaml`, Render gateway files; stripped RabbitMQ from `docker-compose.yml` / `scripts` / `k8s`; `frontend/vercel.json` → per-service rewrites |
| 21:17 | `149e90f` | Pinned `@upstash/qstash@^2.11.3`; verified `npm install` + `src/app.js` import for all 8 services |
| 21:20 | `ca997ab` | appointment SSE `/track` degrades to snapshot+close on Vercel |
| 21:22 | `84c625a` | `README.md` / `DEPLOYMENT.md` / `LOCAL_SETUP.md` updated for Vercel + QStash *(done via subagent)* |

### Phase 1 — Vercel deployment — 2026-09-03

| Time | Commit / event | Work |
|---|---|---|
| ~19:00–20:10 | *(setup)* | Vercel access: attempted access-token route (blocked — wrong token type), then **`vercel login`** device flow succeeded (authenticated as `hammadzubair329-9478`, team `hammads-projects-60b1d2d4`). |
| 20:13 | `2939e0e` | Empty commit to trigger the first Vercel build of `backend` |
| ~20:15 | *(deploy)* | 7 backend projects created via `vercel link` (auth already imported by user via dashboard). Non-secret env vars set. All 7 deployed via CLI (`503 no-DB` — expected). Git disconnected on the 7 to stop root-level clobber builds. |
| 20:26 | `477bb5e` | `DEPLOY_STATUS.md` created (live rollout tracker) |
| 20:32 | `b2a4f67` | Tracker: frontend already on Vercel; QStash account still pending |
| 21:31 | `0edf47d` | All 8 URLs known; `frontend/vercel.json` repointed at real service URLs |
| 21:32 | `bbd971b` | `VERCEL_DEPLOY.md` guide added; redundant per-service `.gitignore` cleaned |
| ~21:40 | *(deploy)* | User provided secrets file. `JWT_SECRET` + `INTERNAL_SECRET` + per-service `MONGODB_URI` (derived) + Cloudinary / Brevo / Agora / Gemini keys set on all 7; Stripe left as placeholders. All 7 redeployed → **`/health` 200**. |
| 21:51 | `f73ca77` | Empty commit to redeploy auth with the synced `JWT_SECRET` |
| ~21:55 | *(test)* | Cross-service JWT verified: token from `auth` accepted by patient (`/api/patients/me` 200) and doctor (`/api/doctors` 200, real records). |
| 22:18 | `fc3e254` | Peer `*_SERVICE_URL` env vars set on patient / appointment / payment / telemedicine / ai-symptom; those redeployed |
| ~22:30 | *(deploy)* | Frontend deployed fresh as `curemd-frontend` (`https://curemd-frontend.vercel.app`) |
| 22:38 | `1836721` | Dropped unsupported `_comment` key from `frontend/vercel.json` |
| 22:39 | `d519366` | `ALLOWED_ORIGINS` + telemedicine `FRONTEND_URL` set to the frontend URL on all 8; redeployed. Frontend→backend proxy + CORS headers verified. |
| ~22:45 | *(setup)* | User created the **Upstash QStash** account; provided the 3 keys. |
| 22:48 | `b2891e6` | `QSTASH_TOKEN` on patient/appointment/payment; `QSTASH_CURRENT_SIGNING_KEY` + `QSTASH_NEXT_SIGNING_KEY` on notification/appointment/payment; those 4 redeployed. `/api/*/events` verified `401` for unsigned requests. |
| ~23:00 | *(setup)* | User configured **cron-job.org** → `POST /api/appointments/internal/run-expiry` every 10 min |
| 23:05 | `b21c232` | Expiry endpoint verified: `200 {"success":true}` with the secret, `401` without |

### Phase 2 — currency + merge + test — 2026-09-03 → 2026-09-04

| Time | Commit / event | Work |
|---|---|---|
| 23:43 (09-03) | `6ba5b0c` | **LKR → USD**: `payment` Stripe currency, notification email templates, 10 frontend files. Frontend build verified. |
| ~00:10 (09-04) | *(data)* | 16 doctor `consultationFee` values rescaled to USD ($80–$125 by experience). DNS-SRV issue on the user's machine worked around by setting public DNS in the one-off script. Verified live via `/api/doctors`. |
| 00:26 | `6b59832` | All 9 Vercel projects: `rootDirectory` + git connection restored via API (production branch stayed `main`, which is correct post-merge). One-off fee script removed. |
| ~00:35 | *(audit)* | Full secret scan of all 22 commits + working tree — **clean**. |
| **00:44** | **`e251b66`** | **`backend` merged → `main` (`--no-ff`), pushed.** All 9 projects auto-deployed from the `main` push → all **READY**. `auth` (`cure-md-project`) production branch flipped `backend` → `main`. `backend` branch fast-forwarded to match `main`. |
| ~00:52 | *(test)* | Automated end-to-end pass: **35 / 38**. Booking flow end-to-end green; QStash chain confirmed — a real receipt email sent via Brevo (seen in `curemd-notification` runtime logs at `19:52:31Z` / `00:52 PKT`). |
| 00:56 | `32f17d8` | Test results recorded in `DEPLOY_STATUS.md` |

### Post-merge — 2026-09-04

| Time | Event |
|---|---|
| ~01:10 | This audit rewritten as the definitive record with the full dated/timed timeline. |
| ~02:30 | **Full regression test** — 91-check API sweep (all 8 services, patient + doctor roles) + static frontend audit (every route/button/link/API call). 86 API PASS. Findings: 3 HIGH, 6 MEDIUM, ~10 LOW. See §14. |
| ~03:30 | **Bug-fix pass** on branch `bugfixes` (commit `6023d9e`) — all HIGH + MEDIUM + the impactful LOW fixed. Frontend builds clean; backend `node --check` clean. Not yet merged/deployed. |

---

## 3. Architecture

| Concern | Before (Render) | After (Vercel) |
|---|---|---|
| Backend runtime | 8 Express apps in Docker containers, always-on | 8 Vercel serverless functions — `api/index.js` exports the Express app |
| API gateway | Nginx service routing `/api/*` → `*.onrender.com` | Removed. `frontend/vercel.json` rewrites `/api/<prefix>/*` → each service's `*.vercel.app` |
| Async events | RabbitMQ topic exchange `healthcare` (persistent consumers) | Upstash QStash — publishers POST to QStash, QStash delivers signed HTTP to consumer `/api/<x>/events` endpoints |
| MongoDB connection | Connect once at boot; `process.exit(1)` on failure | Cached connection promise on `globalThis`, reused across warm invocations; no `process.exit` |
| Appointment expiry | 60-second `setInterval` inside each container | External scheduler (cron-job.org) → `POST /api/appointments/internal/run-expiry` every 10 min, `x-internal-secret` header |
| Real-time appointment tracking (SSE) | 5-minute held stream + in-process `EventEmitter` | On Vercel, sends a snapshot + `retry` hint and closes; browser `EventSource` reconnects (~3s) → degrades to short-poll, no frontend change |
| Deploy config | `render.yaml` blueprint (9 services) | Per-project settings in Vercel (Root Directory + Production Branch + env vars) |
| Local dev | `docker compose` (Mongo + RabbitMQ + Nginx + services) | Same, minus RabbitMQ (events fall back to direct HTTP) |
| Frontend | Vercel, `/api/*` → Render gateway | Vercel, `/api/*` → the 8 Vercel service URLs |

---

## 4. Vercel project inventory

All 9 projects: **Git-connected** to `Hammad-Zubair-off/CureMD-project`, **Production Branch `main`**, Root Directory set, framework preset "Other" (Vite for frontend). A push to `main` auto-deploys every project whose folder changed.

| Project | Service | Production URL | Root Directory | Env vars |
|---|---|---|---|---|
| `cure-md-project` | auth | https://cure-md-project-sigma.vercel.app | `services/auth-service` | 6 |
| `curemd-patient` | patient | https://curemd-patient.vercel.app | `services/patient-service` | 13 |
| `curemd-doctor` | doctor | https://curemd-doctor.vercel.app | `services/doctor-service` | 6 |
| `curemd-appointment` | appointment | https://curemd-appointment.vercel.app | `services/appointment-service` | 15 |
| `curemd-payment` | payment | https://curemd-payment.vercel.app | `services/payment-service` | 14 |
| `curemd-notification` | notification | https://curemd-notification.vercel.app | `services/notification-service` | 11 |
| `curemd-telemedicine` | telemedicine | https://curemd-telemedicine.vercel.app | `services/telemedicine-service` | 10 |
| `curemd-ai-symptom` | ai-symptom | https://curemd-ai-symptom.vercel.app | `services/ai-symptom-service` | 9 |
| `curemd-frontend` | frontend | https://curemd-frontend.vercel.app | `frontend` | 1 |

Every backend `vercel.json`: `rewrites` all paths → `/api`, `functions.maxDuration` 60s.

---

## 5. Environment variables (production, names only)

**Shared across all 8 backend services:** `JWT_SECRET` (identical everywhere), `JWT_EXPIRES_IN=7d`, `NODE_ENV=production`, `MONGODB_URI` (per-service DB), `ALLOWED_ORIGINS=https://curemd-frontend.vercel.app`, `SERVICE_NAME`.

| Service | Additional |
|---|---|
| auth | *(none)* |
| patient | `INTERNAL_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `QSTASH_TOKEN`, `APPOINTMENT_SERVICE_URL`, `NOTIFICATION_SERVICE_URL` |
| doctor | *(none)* |
| appointment | `INTERNAL_SECRET`, `SKIP_PAYMENT=true`, `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`, `PATIENT_SERVICE_URL`, `DOCTOR_SERVICE_URL`, `NOTIFICATION_SERVICE_URL`, `PAYMENT_SERVICE_URL` |
| payment | `INTERNAL_SECRET`, `STRIPE_SECRET_KEY` *(placeholder)*, `STRIPE_WEBHOOK_SECRET` *(placeholder)*, `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`, `APPOINTMENT_SERVICE_URL`, `NOTIFICATION_SERVICE_URL` |
| notification | `BREVO_API_KEY`, `BREVO_FROM_EMAIL`, `BREVO_FROM_NAME`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` |
| telemedicine | `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE`, `FRONTEND_URL`, `TELEMEDICINE_DEV_AUTO_SESSION=true`, `APPOINTMENT_SERVICE_URL` |
| ai-symptom | `GEMINI_API_KEY`, `PATIENT_SERVICE_URL`, `DOCTOR_SERVICE_URL` |
| frontend | `VITE_STRIPE_PUBLIC_KEY` |

Peer `*_SERVICE_URL` values are the production URLs from §4.

---

## 6. External infrastructure

| Service | Role | Notes |
|---|---|---|
| **MongoDB Atlas** | Databases (8: `auth-db`, `patient_db`, `doctor-db`, `appointment-db`, `payment-db`, `notification-db`, `telemedicine-db`, `ai_symptoms`) | Cluster `cluster0.lpkysyi.mongodb.net`. Unchanged by the migration. Network access must allow `0.0.0.0/0` (Vercel egress isn't static). |
| **Upstash QStash** | Async event delivery (EU region, free tier ~500 msg/day) | `QSTASH_TOKEN` on publishers; `QSTASH_CURRENT_SIGNING_KEY` + `QSTASH_NEXT_SIGNING_KEY` on consumers. No topics/queues — publishers POST to explicit consumer URLs. |
| **cron-job.org** | Appointment-expiry trigger | `POST https://curemd-appointment.vercel.app/api/appointments/internal/run-expiry`, header `x-internal-secret`, every 10 min. Verified: 200 with correct secret, 401 without. |
| **Brevo** | Transactional email (receipts, refunds) | Verified sending in production. |
| **Twilio** | SMS (optional) | Not configured — SMS steps log "skipping" and no-op. |
| **Agora** | Video session tokens | Configured; live video not tested (needs 2 participants). |
| **Cloudinary** | Patient file/image uploads | Configured. |
| **Google Gemini** | AI symptom triage | Configured. Model `gemini-flash-latest`. Returned transient `503 model overloaded` during testing (retryable). |
| **Stripe** | Payments | **Not configured** — placeholder keys. `SKIP_PAYMENT=true` bypasses the payment step. |
| **Render** | *(legacy)* Old backend deployment | Still running; not in the request path. Rollback target until deleted. |

---

## 7. Code changes

### Per service (all 8)
- New `src/app.js` — builds & exports the Express app (no `listen`, no DB side effect).
- New `api/index.js` — Vercel handler: ensures cached DB connection, delegates to the app.
- `index.js` reduced to a local/Docker launcher.
- `src/config/db.js` rewritten — memoized connection promise, no `process.exit`.
- New `vercel.json`.
- `.env.example` updated (`NODE_ENV`, Atlas hint; RabbitMQ vars removed).

### Event layer
- **Removed:** `src/config/rabbitmq.js` (5 services), `amqplib` dependency (4 services), `node-cron` (notification, unused).
- **Publishers** (patient, appointment, payment): `src/utils/eventBus.js` rewritten. `publishEvent(routingKey, data)` is now async and routes via a static table to peer `/events` endpoints — QStash when `QSTASH_TOKEN` is set, else direct HTTP (local). All `publishEvent()` call sites in the appointment/payment controllers are now `await`ed.
- **Consumers** (notification, appointment, payment): new `src/routes/eventRoutes.js` (`POST /events`, raw body before the JSON parser, verifies `Upstash-Signature`), new `src/utils/qstashVerify.js`, new `src/handlers/eventHandlers.js` (dispatch map). Notification's 3 subscribe-style handler files collapsed into one `EVENT_HANDLERS` map.

### Routing key → consumer map
| Routing key | Consumers |
|---|---|
| `appointment.confirmed`, `appointment.created`, `consultation.completed` | notification |
| `payment.refunded` | notification, appointment |
| `appointment.rejected_by_doctor`, `appointment.cancelled` | payment |
| *(all others)* | none — publish is a no-op |

### Payment
- Stripe webhook route moved into `src/app.js` **before** `express.json()` so the raw body survives signature verification.
- `src/config/rabbitmq.js` removed; `initPaymentEventConsumers` logic moved to `eventHandlers.js`.

### Appointment
- 60s `setInterval` expirer kept for local dev only; `runExpiryTick` exported; new `POST /api/appointments/internal/run-expiry` (internal-secret guarded).
- SSE `/track` degrades to snapshot+close when `process.env.VERCEL` is set.

### Currency (LKR → USD)
- `payment-service`: Stripe PaymentIntent currency `'lkr'` → `'usd'`.
- `notification-service`: receipt + refund email templates `LKR …` → `$…`, `en-LK` → `en-US`.
- `frontend` (10 files): all `LKR` / `Rs.` fee labels → `$`, `en-LK` → `en-US`, `"Max Consultation Fee (LKR)"` → `(USD)`.

### Platform / infra
- Deleted: `render.yaml`, `rabbitmq.env.example`, `k8s/rabbitmq.yaml`, `api-gateway/Dockerfile.render`, `api-gateway/nginx.render.conf`.
- `docker-compose.yml`: `rabbitmq` service + `notification` `depends_on` removed.
- `scripts/setup-core.sh`, `scripts/setup-full.sh`: stop writing `rabbitmq.env` / `RABBITMQ_URL`.
- `k8s/`: `RABBITMQ_URL` env + `wait-for-rabbitmq` initContainer + `rabbitmq-*` secret keys stripped (k8s is legacy, not a deploy target).
- `frontend/vercel.json`: single gateway rewrite → one rewrite per service.
- New docs: `MIGRATION.md`, `VERCEL_DEPLOY.md`, this file.

---

## 8. Data changes

**Doctor consultation fees** (`doctor-db.doctors`) — rescaled from LKR magnitude to realistic USD, `50 + years_of_experience × 4.5`, rounded to $5, clamped to [$50, $150]. All 16 doctors updated, verified live via `GET /api/doctors`.

| Doctor | Exp | Old (LKR) | New (USD) |
|---|---|---|---|
| Arun Patel | 15y | 2050 | 125 |
| Sarah Chen | 10y | 3100 | 100 |
| Nadia Silva | 9y | 1550 | 95 |
| James Wilson | 12y | 2450 | 110 |
| Hassan Ali | 12y | 1950 | 110 |
| Rajan Fernando | 13y | 2250 | 115 |
| Ahmed Hassan | 14y | 2850 | 120 |
| Thomas Reed | 11y | 2150 | 105 |
| Linda Martinez | 8y | 1350 | 90 |
| Robert Kim | 9y | 2600 | 95 |
| Kevin O'Brien | 7y | 1600 | 85 |
| Omar Farooq | 10y | 1250 | 100 |
| Priya Mendis | 8y | 1750 | 90 |
| Emma Clarke | 6y | 1850 | 80 |
| Laura Bennett | 6y | 1650 | 80 |
| Grace Lee | 5y | 2150 | 80 |

Historical appointment fee snapshots were **not** rewritten (they are per-appointment records).

---

## 9. Test results — 2026-09-04

Automated end-to-end pass against production URLs: **35 / 38 checks passed.**

| Area | Result |
|---|---|
| 8 services + frontend `/health` | ✅ all 200, all deployments READY from `main` |
| Auth — register, login, bad-password rejection | ✅ |
| Cross-service JWT — token from `auth` accepted by patient / doctor / appointment; garbage → 401 | ✅ |
| Doctors — list (16), all fees in $50–150, detail, specializations, availability | ✅ |
| Patient — booking profile save | ✅ (test initially sent `gender:"male"`; API requires `"Male"`) |
| **Booking flow** — book → skip-payment → confirmed → in "my appointments" → slot marked taken | ✅ |
| **QStash event chain** — `appointment.confirmed` → QStash (signed) → notification → **Brevo email sent** | ✅ (verified in `curemd-notification` runtime logs) |
| Telemedicine — session lookup | ✅ (`404 "No session found"` — correct; doctor has not created one) |
| Expiry cron endpoint — rejects wrong `x-internal-secret` | ✅ |
| Event endpoints — enforce `Upstash-Signature` (notification, appointment, payment) | ✅ 3/3 → 401 unsigned |
| Frontend — `/api/*` proxy to backends, SPA served, landing page renders | ✅ |
| AI — session creation | ✅ |
| AI — chat message (Gemini) | ⚠️ `503 "model currently experiencing high demand"` — transient, external, valid key |

**Non-passes analysis:** 2 were test-script input formatting (gender casing), confirmed working with correct input. 1 is a transient Google Gemini capacity error, not a code or config defect.

**Test artefacts in DB:** appointment `6a99cffd4f2ac996df9ad8ae` (test user, Arun Patel, 2026-09-06 — will auto-expire); a few `e2e-*@example.com` users; AI session `6a99d0012a6a3183c3291040`.

---

## 10. Known issues & limitations

| Item | Detail | Impact |
|---|---|---|
| **Gemini `503`** | `gemini-flash-latest` returned model-overloaded during testing | AI symptom checker intermittently unavailable; retries succeed. If persistent, revisit model name / key quota. |
| **SSE real-time tracking degraded** | Serverless can't hold a stream or share an in-process emitter | `/api/appointments/:id/track` becomes ~3s poll-over-`EventSource`. No frontend change; true push would need Pusher/Ably/Redis. |
| **Stripe not live** | Placeholder keys; `SKIP_PAYMENT=true` | Payments bypassed. Currency is USD; **Stripe is not officially available in Sri Lanka** for live payouts. |
| **QStash free tier** | ~500 messages/day | A booking emits 1–2 events; a refund ~3. Fine for demo; watch under load. |
| **Cold starts** | Vercel free tier functions cold-start | Frontend axios timeout is 45s, which absorbs it. |
| **Docs drift** | `README.md` / `Insturctions.md` still describe RabbitMQ + Nginx gateway in places | Cosmetic; `MIGRATION.md` + this file are authoritative. |
| **`pk_test_` in `docker-compose.yml`** | Stripe **publishable** test key hardcoded (line 39), pre-existing | Not a real exposure (publishable keys are client-side by design); move to env var for tidiness. |
| **Twilio not configured** | SMS notifications | SMS steps no-op silently. |

---

## 11. Outstanding tasks

| # | Task | Owner | Priority |
|---|---|---|---|
| 1 | Book with a real email; confirm the `$` receipt arrives | user | high |
| 2 | Test a live video call (Agora, 2 participants + cameras) | user | high |
| 3 | Delete / stop the Render services once satisfied | user | medium |
| 4 | Security cleanup: delete `dburi,txt.txt` and `vercel-token.txt` from Desktop; `npx vercel logout`; delete `claude-deploy` tokens at vercel.com → Account Settings → Tokens | user | high |
| 5 | Configure real Stripe (test then live) — steps in `MIGRATION.md` / thread; set 3 keys, add webhook `https://curemd-payment.vercel.app/api/payments/webhook`, flip `SKIP_PAYMENT` → `false`, redeploy | user | low |
| 6 | If Gemini keeps `503`-ing, change the model id or check the API key quota | user | low |
| 7 | Reconcile `README.md` wording (RabbitMQ / gateway) with the new architecture | either | low |
| 8 | Move `pk_test_` out of `docker-compose.yml` into an env var | either | low |

---

## 12. Rollback plan

The Render deployment is untouched and still serving. To roll back:
1. In the **frontend** Vercel project, revert `frontend/vercel.json` to route `/api/*` at the Render gateway (`git revert` the migration merge on `frontend/vercel.json`, or point a hotfix branch), redeploy.
2. Or point the frontend's custom domain back at the Render-connected deployment.
3. The Vercel backend projects can be left running (idle) or deleted.

No data migration is involved — both Render and Vercel talk to the same MongoDB Atlas cluster, so switching the frontend's API target is the only rollback step.

---

## 13. Security

- Full secret scan of all 22 migration commits and the working tree — **clean**. No credentials, keys, connection strings, or tokens in any tracked file; only placeholders in `.env.example` / docs / `k8s/example.secrets.yaml`.
- All real secrets live only in Vercel project env vars (production scope).
- `.env.local` and `.vercel/` folders the Vercel CLI created are git-ignored (contain only a short-lived `VERCEL_OIDC_TOKEN` + non-secret project IDs).
- Local secret files (`dburi,txt.txt`, `vercel-token.txt`) are on the user's Desktop, **outside** the repo — pending deletion (task #4).
- QStash consumer endpoints reject unsigned requests (`401`), verified.
- Internal endpoints (`/api/appointments/internal/run-expiry`, payment/appointment inter-service calls) require `x-internal-secret`.

---

## 14. Regression test & bug-fix pass — 2026-09-04

### Method
- **API:** 91 automated checks — every route across all 8 services, patient + doctor roles, happy path + auth-guard (401/403) + validation (400) failure cases.
- **Frontend:** static source audit — every route in `App.jsx`, every `<button>` / `<Link>` / `<a>` / `onClick`, every `api.*` / `fetch` call, cross-checked against the route map and backend contracts.
- **Result:** 86 API PASS / 3 WARN (test-input formatting, not bugs) / 2 FAIL. Combined with the frontend audit: **3 HIGH, 6 MEDIUM, ~10 LOW** findings.

### Coverage gap (unchanged)
No admin/superadmin account exists on the production DB (`scripts/seed-admin.sh` was only ever run against local Docker), and self-register cannot create one. So the **admin dashboard logic** and all **doctor-approved actions** (edit profile, set availability, accept/reject appts, mark complete, prescriptions, start a telemedicine session) are still **unverified end-to-end** — only their auth guards were confirmed. Live Stripe payment, live Agora video, and Cloudinary uploads are also untested. To unblock: seed an admin into `auth-db` (same insert `seed-admin.sh` does).

### Findings & fixes — branch `bugfixes`, commit `6023d9e`

| Sev | Finding | Fix |
|---|---|---|
| HIGH | `AdminDashboard.jsx:270` used `<AlertTriangle>` without importing it → `ReferenceError` blanked the whole dashboard whenever admin creation failed | added to the `lucide-react` import |
| HIGH | No `<Route path="*">` in `App.jsx`; Stripe `return_url` → `/payment-success` which wasn't a route → blank screen on any 3-D-Secure redirect | added `NotFound` catch-all, new `PaymentSuccess` page + `/payment-success` route, `/doctor` index redirect |
| HIGH | `payment` webhook: `stripe.webhooks.constructEventAsync(...)` not `await`ed → `event` was a pending Promise, `event.type` undefined, **signature never verified** (unsigned POST → 200) and real `payment_intent.*` events silently ignored | added `await` |
| MED | Admin **Refund** button in `FinanceManagement.jsx` was commented out → the entire refund path (`POST /payments/:id/refund`) unreachable from the UI | uncommented; flow already wired |
| MED | `MyAppointments.jsx` "Payment Required" hero button had no `onClick` — dead | wired to `handlePayNow(nextAppointment)`, relabelled "Pay Now" |
| MED | `SymptomChecker` "Schedule Appointment" passed `triageSessionId` in router state that `BookAppointment` never reads | stopped passing dead state (carrying triage context into booking remains a feature, not a bug) |
| MED | `PatientDashboard` stat/action tiles used interpolated `bg-${color}-50` classes — Tailwind v4 can't see them → backgrounds/icon colours didn't render | replaced with a static `TILE` class map |
| MED | `DoctorAppointments` status filter option labelled **"Failed"** actually filtered `status === 'completed'` | relabelled "Completed" |
| MED | `RejectAppointmentModal` treated a network error (no `err.response`) as **success** ("Appointment Rejected") | now surfaces an error instead |
| LOW | Mongoose `CastError` on a malformed `:id` param leaked a **500** (seen on `telemedicine /session/:id/start|end`) | shared `errorHandler` in all 8 services now maps `CastError`/`ValidationError` → 400, Mongo `11000` → 409, JWT errors → 401 |
| LOW | Unguarded `.qualifications.map` / `.consultationFee.toLocaleString()` / `data.medications.length` → crash if an API response lacks a field | null-guarded in `DoctorDetailModal`, `PaymentSummary`, `DoctorVideoRoom` |
| LOW | `RegisterPage` navigated to legacy `/dashboard`; `PaymentPage` typo "redirect to you profile"; `BookingDrawer` dead `pattern="/.../"`; `DateRangePicker` leftover "Checkout…" text; dead `<MoreVertical>` button + unused import in `MyAppointments` | all fixed |

### Deferred (not blocking; noted for cleanup)
- Dead code: orphan `/payment` route + `PaymentPage` (nothing links to it — the pay flow goes through `BookingDrawer`), `pages/Dashboard.jsx` ("coming soon", imported nowhere), `components/patient/PatientProfileForm.jsx` (unused), `data/mockDoctors.js` (only `SPECIALTIES` used), duplicate method defs in `services/patientService.js`, several unused `lucide-react` imports, dead `appointmentService.confirmAppointment` / `paymentService.getPaymentByAppointment`.
- `MyAppointments` re-sorts the full list every render + a 1 s `setInterval` — perf smell, not a correctness bug.
- Static `disabled`, `<button type="submit">` outside `<form>`, no-op `onSubmit`: **none found.**

### Verified working (unchanged from §9, re-confirmed)
All 8 services + frontend healthy; auth + cross-service JWT; full booking flow (book → skip-pay → confirm → reschedule → cancel); QStash → Brevo email delivery; AI symptom sessions + Gemini chat (recovered from the transient 503); every admin route correctly guarded.

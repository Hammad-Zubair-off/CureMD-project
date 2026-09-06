# CureMD — AI-Enabled Smart Healthcare & Telemedicine Platform

Distributed, cloud-native healthcare platform for doctor appointments, video consultations, payments, notifications, and AI-based symptom triage. Built as **microservices** — run locally with Docker Compose, deployed to **Vercel serverless** (8 backend services + frontend) with **Upstash QStash** for async events.

**Repository:** [Hammad-Zubair-off/CureMD-project](https://github.com/Hammad-Zubair-off/CureMD-project)

## System architecture

| Service | Port | Responsibility |
|---------|------|----------------|
| **API Gateway (Nginx)** | 80 | Single entry for all `/api/*` traffic — **local dev only** (production routing is Vercel rewrites in `frontend/vercel.json`) |
| **Frontend (React + Vite)** | 5173 | Patient / doctor / admin dashboards |
| **Auth Service** | 3001 | JWT auth, RBAC (Admin, Doctor, Patient) |
| **Patient Service** | 3002 | Profiles, medical history, Cloudinary uploads |
| **Doctor Service** | 3003 | Doctor profiles, specialties, approval |
| **Appointment Service** | 3004 | Booking, scheduling, payment handoff |
| **Payment Service** | 3005 | Stripe payments & webhooks |
| **Notification Service** | 3006 | Email (Brevo) / SMS (Twilio) via QStash events |
| **Telemedicine Service** | 3007 | Agora video session tokens |
| **AI Symptom Service** | 3008 | Gemini-based triage |
| **MongoDB** | 27017 | Per-service databases |

## Tech stack

- **Backend:** Node.js (Express)
- **Frontend:** React 19, Vite, Tailwind CSS
- **Databases:** MongoDB
- **Async events:** Upstash QStash (HTTP) — direct HTTP locally
- **Payments:** Stripe
- **Video:** Agora RTC
- **AI:** Google Gemini
- **Hosting:** Vercel serverless (backend + frontend) — production. Nginx gateway + RabbitMQ existed only in the pre-migration Render/Docker setup and are gone; see `MIGRATION.md`.
- **Containers:** Docker & Docker Compose — local development only
- **Orchestration:** Kubernetes manifests under `k8s/` — legacy, not a deploy target and unmaintained

---

## Quick start (local)

### Prerequisites

- Docker Desktop **or** Colima + Docker
- Node.js 18+ (for frontend `npm run dev`)
- Free ports: `80`, `5173`, `3001–3008`, `27017`

### 1. Clone

```bash
git clone https://github.com/Hammad-Zubair-off/CureMD-project.git
cd CureMD-project
```

### 2. Bootstrap env files

```bash
# Copy all example env files (or use the helper script for core services)
cp frontend/.env.example frontend/.env

for s in auth patient doctor appointment payment notification telemedicine ai-symptom; do
  cp "services/${s}-service/.env.example" "services/${s}-service/.env"
done

# Or bootstrap core services automatically (local Mongo URIs + shared JWT):
./scripts/setup-core.sh
```

> **Important:** Use the **same** `JWT_SECRET` (and `INTERNAL_SECRET` where used) across services so tokens and internal calls work.

### 3. Start backend (core)

```bash
./scripts/start-core.sh
# or: docker compose -f docker-compose.yml -f docker-compose.local.yml --profile full up -d
```

### 4. Start frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. Vite proxies `/api/*` → `http://localhost:80`.

### Stop

```bash
./scripts/stop-all.sh
```

More detail: see [`LOCAL_SETUP.md`](./LOCAL_SETUP.md).

---

## Environment variables

Real `.env` files are **gitignored**. Copy each `*.example` file and fill in values.

### Frontend — `frontend/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_STRIPE_PUBLIC_KEY` | Yes* | Stripe **publishable** key (`pk_test_...`) — safe to expose to the browser by design |
| `VITE_SKIP_PAYMENT` | No | `true` skips the Stripe step during booking. Set to `true` in production today (Stripe is on placeholder keys). |
| `VITE_API_URL` | No | Override the API base (default: Vite dev proxy locally; same-origin `/api/*` rewrites in production) |

\*Required only if `VITE_SKIP_PAYMENT` is not `true`.

> The telemedicine "join/start early" and "camera test" behaviour was controlled by `VITE_TELEMEDICINE_ALLOW_UPCOMING_JOIN` / `_ALLOW_UPCOMING_START` / `_CAMERA_TEST_MODE`. Those flags were **removed** (commit `5aa403d`); join/start is now gated strictly on the appointment being confirmed and dated today.

### Auth service — `services/auth-service/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | Default `3001` |
| `SERVICE_NAME` | Yes | e.g. `auth_service` |
| `NODE_ENV` | No | Default `development` |
| `MONGODB_URI` | Yes | MongoDB connection string (`auth-db`) |
| `JWT_SECRET` | Yes | Shared signing secret (must match all services) |
| `JWT_EXPIRES_IN` | No | Default `7d` |
| `ALLOWED_ORIGINS` | Yes | CORS origins, comma-separated |
| `INTERNAL_SECRET` | Yes | Guards `GET /api/auth/internal/users/:id/status`; must match all backends |

### Patient service — `services/patient-service/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | Default `3002` |
| `SERVICE_NAME` | Yes | e.g. `patient` |
| `NODE_ENV` | No | Default `development` |
| `MONGODB_URI` | Yes | MongoDB URI (`patient_db`) |
| `JWT_SECRET` | Yes | Same as auth |
| `JWT_EXPIRES_IN` | No | Default `7d` |
| `ALLOWED_ORIGINS` | Yes | CORS origins |
| `QSTASH_TOKEN` | No | Empty locally; Upstash token in prod |
| `INTERNAL_SECRET` | Yes | Account-status re-check against auth-service; must match all backends |
| `AUTH_SERVICE_URL` | No | Default `http://auth-service:3001` |
| `CLOUDINARY_CLOUD_NAME` | Yes* | Cloudinary cloud name (file uploads) |
| `CLOUDINARY_API_KEY` | Yes* | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes* | Cloudinary API secret |
| `APPOINTMENT_SERVICE_URL` | No | Default `http://appointment-service:3004` |
| `NOTIFICATION_SERVICE_URL` | No | Default `http://notification-service:3006` |

\*Uploads fail until real Cloudinary credentials are set.

### Doctor service — `services/doctor-service/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | Default `3003` |
| `SERVICE_NAME` | Yes | e.g. `doctor` |
| `NODE_ENV` | No | Default `development` |
| `MONGODB_URI` | Yes | MongoDB URI (`doctor-db`) |
| `JWT_SECRET` | Yes | Same as auth |
| `JWT_EXPIRES_IN` | No | Default `7d` |
| `ALLOWED_ORIGINS` | Yes | CORS origins |
| `INTERNAL_SECRET` | Yes | Account-status re-check against auth-service; must match all backends |
| `AUTH_SERVICE_URL` | No | Default `http://auth-service:3001` |
| `APPOINTMENT_SERVICE_URL` | No | Default `http://appointment-service:3004` — used to verify appointment ownership before saving a prescription |

### Appointment service — `services/appointment-service/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | Default `3004` |
| `SERVICE_NAME` | Yes | e.g. `appointment` |
| `NODE_ENV` | No | Default `development` |
| `MONGODB_URI` | Yes | MongoDB URI (`appointment-db`) |
| `JWT_SECRET` | Yes | Same as auth |
| `JWT_EXPIRES_IN` | No | Default `7d` |
| `ALLOWED_ORIGINS` | Yes | CORS origins |
| `QSTASH_TOKEN` | No | Empty locally; Upstash token in prod |
| `INTERNAL_SECRET` | Yes | Shared secret for service-to-service calls; must match all backends |
| `AUTH_SERVICE_URL` | No | Default `http://auth-service:3001` |
| `SKIP_PAYMENT` | No | `true` skips payment confirmation in local/dev |
| `PATIENT_SERVICE_URL` | No | Default `http://patient-service:3002` |
| `DOCTOR_SERVICE_URL` | No | Default `http://doctor-service:3003` |
| `NOTIFICATION_SERVICE_URL` | No | Default `http://notification-service:3006` |
| `PAYMENT_SERVICE_URL` | No | Default `http://payment-service:3005` |

### Payment service — `services/payment-service/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | Default `3005` |
| `SERVICE_NAME` | Yes | e.g. `payment` |
| `NODE_ENV` | No | Default `development` |
| `MONGODB_URI` | Yes | MongoDB URI (`payment-db`) |
| `JWT_SECRET` | Yes | Same as auth |
| `JWT_EXPIRES_IN` | No | Default `7d` |
| `ALLOWED_ORIGINS` | Yes | CORS origins |
| `QSTASH_TOKEN` | No | Empty locally; Upstash token in prod |
| `INTERNAL_SECRET` | Yes | Must match all backends |
| `AUTH_SERVICE_URL` | No | Default `http://auth-service:3001` |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Yes* | Stripe webhook signing secret |
| `APPOINTMENT_SERVICE_URL` | No | Default `http://appointment-service:3004` |
| `NOTIFICATION_SERVICE_URL` | No | Default `http://notification-service:3006` |

\*Can be relaxed in development when webhook verification is skipped.

### Notification service — `services/notification-service/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | Default `3006` |
| `SERVICE_NAME` | Yes | e.g. `notification` |
| `NODE_ENV` | No | Default `development` |
| `MONGODB_URI` | Yes | MongoDB URI (`notification-db`) |
| `JWT_SECRET` | Yes | Same as auth |
| `JWT_EXPIRES_IN` | No | Default `7d` |
| `ALLOWED_ORIGINS` | Yes | CORS origins |
| `QSTASH_CURRENT_SIGNING_KEY` | No | Empty locally; from Upstash in prod |
| `QSTASH_NEXT_SIGNING_KEY` | No | Empty locally; from Upstash in prod |
| `BREVO_API_KEY` | Yes* | Brevo API key for email |
| `BREVO_FROM_EMAIL` | Yes* | Verified sender email |
| `BREVO_FROM_NAME` | No | Sender display name |
| `TWILIO_ACCOUNT_SID` | No | Twilio SID (SMS) |
| `TWILIO_AUTH_TOKEN` | No | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | No | Twilio from-number |

\*Service starts with placeholders; real emails need a valid Brevo key.

### Telemedicine service — `services/telemedicine-service/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | Default `3007` |
| `SERVICE_NAME` | Yes | e.g. `telemedicine` |
| `NODE_ENV` | No | Default `development` |
| `MONGODB_URI` | Yes | MongoDB URI (`telemedicine-db`) |
| `JWT_SECRET` | Yes | Same as auth |
| `JWT_EXPIRES_IN` | No | Default `7d` |
| `ALLOWED_ORIGINS` | Yes | CORS origins |
| `INTERNAL_SECRET` | Yes | Account-status re-check against auth-service; must match all backends |
| `AUTH_SERVICE_URL` | No | Default `http://auth-service:3001` |
| `AGORA_APP_ID` | Yes | Agora App ID |
| `AGORA_APP_CERTIFICATE` | Yes | Agora App Certificate |
| `FRONTEND_URL` | Yes | e.g. `http://localhost:5173` (join links) |
| `TELEMEDICINE_DEV_AUTO_SESSION` | No | `true` auto-creates sessions in local/dev |
| `APPOINTMENT_SERVICE_URL` | No | Default `http://appointment-service:3004` |

### AI symptom service — `services/ai-symptom-service/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | Default `3008` |
| `SERVICE_NAME` | Yes | e.g. `ai_symptoms` |
| `NODE_ENV` | No | Default `development` |
| `MONGODB_URI` | Yes | MongoDB URI (`ai_symptoms`) |
| `JWT_SECRET` | Yes | Same as auth |
| `JWT_EXPIRES_IN` | No | Default `7d` |
| `ALLOWED_ORIGINS` | Yes | CORS origins |
| `INTERNAL_SECRET` | Yes | Account-status re-check against auth-service; must match all backends |
| `AUTH_SERVICE_URL` | No | Default `http://auth-service:3001` |
| `GEMINI_API_KEY` | Yes | Google Gemini API key (model `gemini-flash-latest`) |
| `PATIENT_SERVICE_URL` | No | Default `http://patient-service:3002` |
| `DOCTOR_SERVICE_URL` | No | Default `http://doctor-service:3003` |

### Shared secrets checklist

| Secret | Used by | Notes |
|--------|---------|-------|
| `JWT_SECRET` | **All** services | Must be identical everywhere |
| `INTERNAL_SECRET` | **All 8 backend** services | `auth-service` exposes `GET /api/auth/internal/users/:id/status`; the other 7 call it on every request to re-check account status. Also guards the appointment expiry + inter-service payment/appointment calls. Must be byte-identical across all 8. |
| `AUTH_SERVICE_URL` | patient, doctor, appointment, payment, telemedicine, ai-symptom | Base URL of `auth-service` for the status check. Default `http://auth-service:3001` locally; the deployed auth URL in prod. |
| `QSTASH_TOKEN` | patient, appointment, payment (publishers) | Empty locally; Upstash token in prod |
| `QSTASH_CURRENT_SIGNING_KEY` / `QSTASH_NEXT_SIGNING_KEY` | notification, appointment, payment (consumers) | Empty locally; from Upstash in prod |
| `MONGODB_URI` | Each service | Local Docker: `mongodb://mongo:27017/<db>` or Atlas SRV URIs |

---

## Project structure

```
CureMD-project/
├── api-gateway/           # Nginx configs (local dev only)
├── frontend/              # React + Vite client
├── services/
│   ├── auth-service/
│   ├── patient-service/
│   ├── doctor-service/
│   ├── appointment-service/
│   ├── payment-service/
│   ├── notification-service/
│   ├── telemedicine-service/
│   └── ai-symptom-service/
├── scripts/               # setup / start / stop / smoke tests
├── k8s/                   # Kubernetes manifests
├── docker-compose.yml
├── docker-compose.local.yml
├── MIGRATION.md
└── LOCAL_SETUP.md
```

## Security notes

- Never commit real `.env` files — they are ignored via `.gitignore`.
- Commit only `*.env.example` files with placeholders.
- Rotate any keys that were previously committed or shared in chat.
- Doctor accounts start with `isApproved: false`; approve in MongoDB for local testing (see `LOCAL_SETUP.md`).

## License

ISC / project course use — update as needed for your organization.

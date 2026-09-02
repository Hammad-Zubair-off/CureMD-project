# Backend migration: Render → Vercel

Moves the 8 backend microservices from Render (Docker web services) to **Vercel serverless functions**, and replaces **RabbitMQ** with **Upstash QStash** for async events.

Status: in progress on branch `backend`.

---

## Target architecture

| Piece | Before (Render) | After (Vercel) |
|---|---|---|
| 8 Express services | Docker containers, `app.listen()` | Serverless functions — `api/index.js` exports the Express app |
| API gateway | Nginx service routing `/api/*` → `*.onrender.com` | Deleted. `frontend/vercel.json` rewrites `/api/<prefix>` → each service's `*.vercel.app` |
| Async events | RabbitMQ topic exchange `healthcare` | Upstash QStash (HTTP). Local dev falls back to direct HTTP POST |
| MongoDB connect | Connect once at boot, `process.exit(1)` on failure | Cached connection promise reused across warm invocations |
| Deploy config | `render.yaml` blueprint | Per-project settings in the Vercel dashboard (see checklist below) |
| Local dev | `docker compose` (Mongo + RabbitMQ + Nginx + services) | Unchanged, minus RabbitMQ |

Each service becomes **its own Vercel project** with **Root Directory** set to `services/<name>-service`.

---

## Per-service file changes

Every service gets:

```
services/<name>-service/
├── api/
│   └── index.js        # NEW — Vercel entrypoint: connects DB, exports app
├── src/
│   ├── app.js          # NEW — builds & exports the Express app (no listen, no DB connect)
│   └── config/
│       └── db.js        # REWRITTEN — cached connection, no process.exit
├── index.js            # REWRITTEN — thin local-dev launcher (Docker still uses this)
├── vercel.json         # NEW
└── .env.example        # UPDATED
```

`vercel.json` (identical for every service):

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [{ "source": "/(.*)", "destination": "/api" }],
  "functions": { "api/index.js": { "maxDuration": 60 } }
}
```

The rewrite sends **all** paths (`/health`, `/api/auth/login`, …) to the single function; Express does the routing as before.

---

## Event layer (QStash)

`src/utils/eventBus.js` is rewritten. Public API is unchanged for publishers:

```js
publishEvent(routingKey, data)   // never throws
```

Routing table (in `eventBus.js`), keyed by routing key → list of `{ service, path }`:

| Routing key | Targets |
|---|---|
| `appointment.confirmed` | notification |
| `appointment.created` | notification |
| `consultation.completed` | notification |
| `payment.refunded` | notification, appointment |
| `appointment.rejected_by_doctor` | payment |
| `appointment.cancelled` | payment |
| *(all other keys)* | none — publish is a no-op |

Transport:
- **Production** (`QSTASH_TOKEN` set): `qstash.publishJSON({ url, body: { event, data }, retries: 3 })` per target.
- **Local** (no token): `axios.post(url, { event, data })`, fire-and-forget.

Consumers (`notification`, `appointment`, `payment`) expose:

```
POST /api/<x>/events        body: { event: "<routingKey>", data: {...} }
```

- Raw body parsed via `express.raw({ type: '*/*' })` on that route only.
- If `QSTASH_CURRENT_SIGNING_KEY` is set, the `Upstash-Signature` header is verified; otherwise verification is skipped (local).
- Handler dispatches on `event` and calls the existing handler function.
- 2xx = ack. Non-2xx = QStash retries with backoff.

`src/config/rabbitmq.js` and the `amqplib` dependency are removed from every service.

---

## Vercel project setup (do this once per service, 8 total)

For each `services/<name>-service`:

1. **New Project** in Vercel → import the `CureMD-project` repo.
2. **Root Directory** = `services/<name>-service`.
3. Framework preset = **Other**. Build command = *(empty)*. Output dir = *(empty)*. Install command = `npm install`.
4. Add the environment variables from the checklist below.
5. Deploy. Note the production URL (`https://<project>.vercel.app`).

After all 8 are deployed, fill the real URLs into:
- each service's `*_SERVICE_URL` env vars
- `frontend/vercel.json`

### Shared env vars (every service)

| Key | Value |
|---|---|
| `JWT_SECRET` | same secret across all services |
| `JWT_EXPIRES_IN` | `7d` |
| `MONGODB_URI` | that service's MongoDB Atlas connection string |
| `ALLOWED_ORIGINS` | `https://<frontend-domain>` (comma-separated if several) |
| `NODE_ENV` | `production` |

### Service-specific env vars

| Service | Extra keys |
|---|---|
| auth | — |
| patient | `INTERNAL_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `APPOINTMENT_SERVICE_URL`, `QSTASH_TOKEN` |
| doctor | — |
| appointment | `INTERNAL_SECRET`, `SKIP_PAYMENT`, `PATIENT_SERVICE_URL`, `DOCTOR_SERVICE_URL`, `NOTIFICATION_SERVICE_URL`, `PAYMENT_SERVICE_URL`, `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` |
| payment | `INTERNAL_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `APPOINTMENT_SERVICE_URL`, `NOTIFICATION_SERVICE_URL`, `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` |
| notification | `BREVO_API_KEY`, `BREVO_FROM_EMAIL`, `BREVO_FROM_NAME`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` |
| telemedicine | `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE`, `FRONTEND_URL`, `TELEMEDICINE_DEV_AUTO_SESSION`, `APPOINTMENT_SERVICE_URL` |
| ai-symptom | `GEMINI_API_KEY`, `PATIENT_SERVICE_URL`, `DOCTOR_SERVICE_URL` |

`QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` all come from the Upstash QStash console.

---

## Stripe webhook

`https://<payment-project>.vercel.app/api/payments/webhook` — set this URL in the Stripe dashboard and copy the new signing secret into `STRIPE_WEBHOOK_SECRET`. The webhook route is mounted with a raw body parser **before** the JSON parser in `payment` `src/app.js`.

---

## Local development (after migration)

RabbitMQ is gone. Everything else is the same:

```bash
./scripts/setup-core.sh
docker compose -f docker-compose.yml -f docker-compose.local.yml --profile full up -d
cd frontend && npm run dev
```

Events between services run over direct HTTP on the Docker network (no `QSTASH_TOKEN` locally).

# Deploying CureMD (Vercel + MongoDB Atlas + Upstash QStash)

Minimal deploy: core flows (auth, patient/doctor profiles, booking) run on real
infra. Payment, telemedicine, and AI features boot with dev-mode flags
(`SKIP_PAYMENT=true`, `TELEMEDICINE_DEV_AUTO_SESSION=true`, placeholder keys)
so nothing blocks launch — swap in real Stripe/Agora/Brevo/Gemini keys later
without redeploying the whole stack.

## 0. Accounts needed
- **Vercel** — Hobby plan is fine (one project per backend service + one for the frontend).
- **MongoDB Atlas** — account + cluster.
- **Upstash** — for QStash (async events).
- For full features: **Stripe**, **Agora**, **Brevo**, **Twilio**, **Cloudinary**, **Google Gemini**.

## 1. MongoDB Atlas — get connection strings (~10 min)
You need **one URI per service database** (8 total: auth, patient, doctor,
appointment, payment, notification, telemedicine, ai_symptoms). All can live
in the same cluster, just different DB names.

1. In Atlas → **Database Access**: create a DB user (username/password).
2. **Network Access**: add `0.0.0.0/0` (allow from anywhere) — Vercel's
   serverless egress IPs aren't static.
3. **Connect → Drivers**, copy the SRV string, e.g.:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority`
4. Build 8 URIs by swapping `<dbname>` for: `auth-db`, `patient_db`,
   `doctor-db`, `appointment-db`, `payment-db`, `notification-db`,
   `telemedicine-db`, `ai_symptoms`.

Keep these handy — you'll paste one into each Vercel project.

## 2. Upstash QStash (~5 min)
1. Sign in at [console.upstash.com](https://console.upstash.com).
2. Open **QStash**.
3. Copy `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, and
   `QSTASH_NEXT_SIGNING_KEY`.

Free tier is ~500 messages/day. There are **no queues or topics to
pre-create** — publishing targets explicit consumer URLs.

## 3. Deploy the 8 backend services to Vercel (~30-45 min)
This is fully detailed in [`MIGRATION.md`](MIGRATION.md) (see "Vercel project
setup" plus the per-service env checklist). In short:

- **One Vercel project per service** (8 projects).
- **Root Directory**: `services/<name>-service`.
- **Framework preset**: "Other".
- **Build command**: leave empty.
- **Install command**: `npm install`.

Deploy each project and record its `*.vercel.app` URL — you need all 8 for the
next step. Publishers also need `QSTASH_TOKEN` (from step 2); consumers
(notification, appointment, payment) need `QSTASH_CURRENT_SIGNING_KEY` +
`QSTASH_NEXT_SIGNING_KEY`.

## 4. Cross-wire the service URLs (~10 min)
Once all 8 `*.vercel.app` URLs exist:

- Set each publisher's peer `*_SERVICE_URL` env vars to the real URLs
  (`NOTIFICATION_SERVICE_URL`, `PAYMENT_SERVICE_URL`, `APPOINTMENT_SERVICE_URL`,
  `PATIENT_SERVICE_URL`, `DOCTOR_SERVICE_URL` as relevant per service — see the
  README env tables).
- Set `ALLOWED_ORIGINS` on **every** service to the frontend domain (from
  step 5; use a placeholder first, then update).
- Set `FRONTEND_URL` on **curemd-telemedicine-service** to the frontend domain
  (used to build video-session join links).
- Redeploy each service so the new env vars take effect.

## 5. Deploy the frontend to Vercel (~10-15 min)
1. On Vercel: **New Project**, import the same GitHub repo.
2. **Root Directory**: `frontend`.
3. Framework preset: **Vite** (auto-detected). Build command `npm run build`,
   output `dist`.
4. Env var: `VITE_STRIPE_PUBLIC_KEY` = any `pk_test_...` placeholder (payment
   UI renders but the flow is skipped server-side).
5. Deploy. Note your Vercel URL, e.g. `https://curemd.vercel.app`.
6. Edit [`frontend/vercel.json`](frontend/vercel.json): it has **one rewrite
   per service** with placeholder hosts `curemd-<svc>-service.vercel.app`.
   Replace each placeholder with the real service URL from step 3. Commit and
   redeploy the frontend.
7. Go back and set `ALLOWED_ORIGINS` (step 4) on every service to this real
   frontend URL, then redeploy the services.

## 6. Stripe webhook
Point a Stripe webhook at
`https://<payment-project>.vercel.app/api/payments/webhook` and put the
signing secret in `STRIPE_WEBHOOK_SECRET` on the payment project.

## 7. Appointment expiry cron
The old 60-second `setInterval` expirer only runs in local `index.js` — it
does **not** run on serverless. Set up an external scheduler to call the
internal expiry route:

- **cron-job.org** (every 5-15 min) or **Vercel Cron** (once/day is the Hobby
  limit).
- Request: `POST https://<appointment-project>.vercel.app/api/appointments/internal/run-expiry`
- Header: `x-internal-secret: <INTERNAL_SECRET>` (must match the appointment
  service's `INTERNAL_SECRET`).

## 8. Test end-to-end
- Open your Vercel URL, register a patient, register a doctor, log in as each.
- Doctor accounts start `isApproved: false` — approve via Atlas: open the
  `auth-db` database → `users` collection → set `isApproved: true` on the
  doctor's document, then re-login.
- Book an appointment as the patient (payment step is skipped).
- Confirm the appointment shows up for the doctor.

## Adding real integrations later
Each is independent — update the relevant Vercel project's env vars and
redeploy that project, no other service needs to change:
- **Stripe**: real keys in the payment project, then flip `SKIP_PAYMENT` to
  `false` in the appointment project.
- **Agora**: real `AGORA_APP_ID`/`AGORA_APP_CERTIFICATE` in the telemedicine
  project, then flip `TELEMEDICINE_DEV_AUTO_SESSION` to `false`.
- **Brevo/Twilio**: real keys in the notification project.
- **Cloudinary**: real keys in the patient project.
- **Gemini**: real key in the ai-symptom project.

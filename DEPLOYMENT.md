# Deploying CureMD (Vercel + Render + Atlas + CloudAMQP)

Minimal deploy: core flows (auth, patient/doctor profiles, booking) run on real
infra. Payment, telemedicine, and AI features boot with dev-mode flags
(`SKIP_PAYMENT=true`, `TELEMEDICINE_DEV_AUTO_SESSION=true`, placeholder keys)
so nothing blocks launch — swap in real Stripe/Agora/SendGrid/Gemini keys later
without redeploying the whole stack.

## 0. What you already have
- MongoDB Atlas account + cluster ✅

## 1. MongoDB Atlas — get connection strings (~10 min)
You need **one URI per service database** (8 total: auth, patient, doctor,
appointment, payment, notification, telemedicine, ai_symptoms). All can live
in the same cluster, just different DB names.

1. In Atlas → **Database Access**: create a DB user (username/password).
2. **Network Access**: add `0.0.0.0/0` (allow from anywhere) — Render's IPs
   aren't static on the free plan.
3. **Connect → Drivers**, copy the SRV string, e.g.:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority`
4. Build 8 URIs by swapping `<dbname>` for: `auth-db`, `patient_db`,
   `doctor-db`, `appointment-db`, `payment-db`, `notification-db`,
   `telemedicine-db`, `ai_symptoms`.

Keep these handy — you'll paste one into each Render service.

## 2. CloudAMQP — RabbitMQ (~5-10 min)
1. Sign up at cloudamqp.com → create a **free "Little Lemur"** instance.
2. Open the instance → copy the **AMQP URL** (looks like
   `amqps://user:pass@host/vhost`).
3. You'll paste this once into the `curemd-shared` env group on Render (used
   by patient, appointment, payment, notification, telemedicine services).

## 3. Render — deploy the blueprint (~20-30 min)
This repo already has [`render.yaml`](render.yaml) defining all 9 services
(gateway + 8 backend services) as a **Blueprint**, so you deploy them together
instead of clicking through the dashboard 9 times.

1. Push this repo to GitHub if it isn't already there.
2. On Render: **New → Blueprint**, connect your GitHub repo, select it.
   Render reads `render.yaml` and lists all 9 services.
3. Before clicking deploy, you'll be prompted for every `sync: false` env var.
   Fill in:
   - **curemd-shared group**: `ALLOWED_ORIGINS` (leave a placeholder like
     `https://placeholder.vercel.app` for now — you'll update after step 4),
     `FRONTEND_URL` (same placeholder), `RABBITMQ_URL` (from step 2)
   - **curemd-auth-service**: `MONGODB_URI` (auth-db)
   - **curemd-patient-service**: `MONGODB_URI` (patient_db),
     `CLOUDINARY_CLOUD_NAME`/`CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET`
     (any placeholder string is fine for now — uploads just won't work yet)
   - **curemd-doctor-service**: `MONGODB_URI` (doctor-db)
   - **curemd-appointment-service**: `MONGODB_URI` (appointment-db)
   - **curemd-payment-service**: `MONGODB_URI` (payment-db),
     `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` (placeholder ok, payment is
     skipped via `SKIP_PAYMENT=true`)
   - **curemd-notification-service**: `MONGODB_URI` (notification-db),
     `BREVO_API_KEY`/`BREVO_FROM_EMAIL` (placeholder ok, emails just
     won't send yet)
   - **curemd-telemedicine-service**: `MONGODB_URI` (telemedicine-db),
     `AGORA_APP_ID`/`AGORA_APP_CERTIFICATE` (placeholder ok, dev auto-session
     flag is on)
   - **curemd-ai-symptom-service**: `MONGODB_URI` (ai_symptoms),
     `GEMINI_API_KEY` (placeholder ok, triage calls just won't work yet)

   `JWT_SECRET` and `INTERNAL_SECRET` are auto-generated once and shared
   across all services automatically via the env group — you don't need to
   touch those.

4. Click **Apply**. Render builds and deploys all 9 services. First build is
   the slowest part — grab a coffee.
5. Once live, note the gateway's public URL, e.g.
   `https://curemd-api-gateway.onrender.com` (visit `/health` to confirm it's
   up — individual service health checks are at each service's own
   `<service>.onrender.com/health`).

   > If any service name was already taken globally on Render, it'll get a
   > suffix (e.g. `curemd-auth-service-ab12`). If that happens to
   > **curemd-api-gateway** specifically, update the URL in
   > `frontend/vercel.json` to match before deploying the frontend.

## 4. Vercel — deploy the frontend (~10-15 min)
1. On Vercel: **New Project**, import the same GitHub repo.
2. Set **Root Directory** to `frontend`.
3. Framework preset: Vite (auto-detected). Build command `npm run build`,
   output `dist` (defaults are fine).
4. Env var: `VITE_STRIPE_PUBLIC_KEY` = any `pk_test_...` placeholder (payment
   UI renders but flow is skipped server-side).
5. Deploy. Note your Vercel URL, e.g. `https://curemd.vercel.app`.
6. [`frontend/vercel.json`](frontend/vercel.json) already rewrites `/api/*` to
   the Render gateway — confirm the hostname matches step 3's gateway URL.

## 5. Wire it together (~10 min)
Now that both URLs exist, go back to Render → the **curemd-shared** env
group → update:
- `ALLOWED_ORIGINS` → your real Vercel URL (e.g. `https://curemd.vercel.app`)
- `FRONTEND_URL` → same Vercel URL

Saving this triggers a redeploy of every service that uses the group (that's
expected — it's how the CORS/join-link URLs get applied everywhere at once).

## 6. Test end-to-end
- Open your Vercel URL, register a patient, register a doctor, log in as each.
- Doctor accounts start `isApproved: false` — approve via Atlas: open the
  `auth-db` database → `users` collection → set `isApproved: true` on the
  doctor's document, then re-login.
- Book an appointment as the patient (payment step is skipped).
- Confirm the appointment shows up for the doctor.

## Adding real integrations later
Each is independent — update the relevant Render service's env vars and it
redeploys on its own, no other service needs to change:
- **Stripe**: real keys in `curemd-payment-service`, then flip
  `SKIP_PAYMENT` to `false` in `curemd-appointment-service`.
- **Agora**: real `AGORA_APP_ID`/`AGORA_APP_CERTIFICATE` in
  `curemd-telemedicine-service`, then flip `TELEMEDICINE_DEV_AUTO_SESSION` to
  `false`.
- **SendGrid/Twilio**: real keys in `curemd-notification-service`.
- **Cloudinary**: real keys in `curemd-patient-service`.
- **Gemini**: real key in `curemd-ai-symptom-service`.

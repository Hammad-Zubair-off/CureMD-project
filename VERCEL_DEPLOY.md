# Vercel deployment — step by step (for the repo owner)

This deploys the CureMD backend (8 services) + frontend to **Vercel**, replacing
the old Render setup. It must be done by **Hammad-Zubair-off** because Vercel's
GitHub App can only be installed on a personal repo by that repo's owner.

Time: ~90 min the first time. You need the values listed in **Part 0** ready.

---

## Part 0 — Collect values first

Open the current **Render dashboard** in another tab. You'll copy most of these.

**Shared across every service** (must be byte-identical everywhere):

| Key | Where to get it |
|---|---|
| `JWT_SECRET` | Render → `curemd-shared` env group |
| `INTERNAL_SECRET` | Render → `curemd-shared` env group |

**Per-service MongoDB URIs** — 8 of them, from each Render service's `MONGODB_URI`:
`auth-db`, `patient_db`, `doctor-db`, `appointment-db`, `payment-db`,
`notification-db`, `telemedicine-db`, `ai_symptoms`.

**Third-party keys** — from the matching Render service:

| Provider | Keys |
|---|---|
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| Brevo | `BREVO_API_KEY`, `BREVO_FROM_EMAIL`, `BREVO_FROM_NAME` |
| Twilio (optional SMS) | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` |
| Agora | `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE` |
| Google Gemini | `GEMINI_API_KEY` |
| Cloudinary | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |

Keep Render **running** until Vercel is fully verified — it's the fallback.

---

## Part 1 — Get the code onto `main`

The migration lives on the `backend` branch. Before deploying:

1. Abdul pushes it: `git push -u origin backend`
2. Abdul opens a Pull Request: `backend` → `main`.
3. **Hammad reviews the PR** (it's a large change: serverless entrypoints,
   RabbitMQ → QStash, Render files deleted). See `MIGRATION.md` for the plan.
4. Merge the PR into `main`.

Vercel will deploy from `main`.

> If you want to test on Vercel *before* merging: skip the merge, and in each
> project's **Settings → Git**, set **Production Branch** to `backend`. Flip it
> back to `main` after the PR merges.

---

## Part 2 — Connect GitHub to Vercel (Hammad, once)

1. Go to **vercel.com** → **Sign Up** / **Log In** → **Continue with GitHub**
   (use the `Hammad-Zubair-off` account).
2. When GitHub asks to authorize Vercel, approve it.
3. You'll land on a personal ("Hobby") account. That's fine — it's free.
4. First time you import a project (Part 4), Vercel shows
   **"Install Vercel" / "Configure GitHub App"**. Choose:
   - **Only select repositories** → pick **`CureMD-project`** → **Install**.
   (Or "All repositories" if you prefer.)

> **Free-plan note:** Hobby projects are single-user — Abdul won't get dashboard
> access without a paid Team. But Abdul can still **trigger deploys by pushing
> to GitHub** (Vercel auto-builds). Only *settings/env-var/log* access needs the
> dashboard, which stays with Hammad. That's usually fine.

---

## Part 3 — Create the Upstash QStash account (either person, once)

1. **console.upstash.com** → sign in with GitHub.
2. Top nav → **QStash**.
3. Copy these three values (used as env vars below):
   - `QSTASH_TOKEN`
   - `QSTASH_CURRENT_SIGNING_KEY`
   - `QSTASH_NEXT_SIGNING_KEY`
4. Nothing else to configure — no topics or queues.

---

## Part 4 — Deploy backend service #1 (auth-service) — the template

1. Vercel dashboard → **Add New… → Project**.
2. Find **CureMD-project** → **Import**.
3. Configure screen:
   - **Project Name:** `curemd-auth-service`
   - **Framework Preset:** **Other**
   - **Root Directory:** click **Edit** → choose `services/auth-service`
   - Expand **Build and Output Settings:**
     - Build Command: **leave empty** (toggle override off)
     - Output Directory: **leave empty**
     - Install Command: `npm install`
   - Expand **Environment Variables** and add (see the auth row in Part 6):
     ```
     JWT_SECRET        = <shared value>
     JWT_EXPIRES_IN    = 7d
     NODE_ENV          = production
     SERVICE_NAME      = auth_service
     MONGODB_URI       = <auth-db URI>
     ALLOWED_ORIGINS   = https://placeholder.vercel.app
     ```
4. **Deploy**. Wait ~1–2 min.
5. Copy the production URL shown (e.g. `https://curemd-auth-service.vercel.app`).
   Write it in your notes.
6. Verify: open `<that URL>/health` → expect `{"status":"ok","service":"auth_service",...}`.

If `/health` returns ok, repeat Part 4 for the other 7 services, changing only
**Project Name**, **Root Directory**, and the **env vars** (Part 6).

> Suggested project names (match the placeholders already in
> `frontend/vercel.json` so you may not need to edit it):
> `curemd-auth-service`, `curemd-patient-service`, `curemd-doctor-service`,
> `curemd-appointment-service`, `curemd-payment-service`,
> `curemd-notification-service`, `curemd-telemedicine-service`,
> `curemd-ai-symptom-service`.
> If a name is taken globally, Vercel appends a suffix — record the **actual**
> URL and use it in Part 5.

---

## Part 5 — Deploy the frontend

1. **Add New… → Project** → import **CureMD-project** again.
2. **Project Name:** `curemd` (or your choice)
3. **Root Directory:** `frontend`
4. **Framework Preset:** **Vite** (auto-detected). Build `npm run build`, output `dist`.
5. Environment Variables:
   ```
   VITE_STRIPE_PUBLIC_KEY = <pk_test_... from Render frontend>
   ```
6. **Deploy**. Copy the URL, e.g. `https://curemd.vercel.app`.
7. Edit **`frontend/vercel.json`** in the repo: it has one rewrite per service
   with placeholder hosts `curemd-<svc>-service.vercel.app`. Replace each with
   the **real** service URL from Part 4. Commit to `main`, push — the frontend
   redeploys automatically.

---

## Part 6 — Environment variables per service

Every service gets the **shared 4** plus its own row.

**Shared (all 8):**
```
JWT_SECRET        = <shared>
JWT_EXPIRES_IN    = 7d
NODE_ENV          = production
MONGODB_URI       = <that service's DB URI>
ALLOWED_ORIGINS   = https://curemd.vercel.app      (the frontend URL from Part 5)
```

**Per service (in addition):**

| Service | Extra env vars |
|---|---|
| **auth** | `SERVICE_NAME=auth_service` |
| **patient** | `SERVICE_NAME=patient`, `INTERNAL_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `QSTASH_TOKEN`, `APPOINTMENT_SERVICE_URL`, `NOTIFICATION_SERVICE_URL` |
| **doctor** | `SERVICE_NAME=doctor` |
| **appointment** | `SERVICE_NAME=appointment`, `INTERNAL_SECRET`, `SKIP_PAYMENT=true`, `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`, `PATIENT_SERVICE_URL`, `DOCTOR_SERVICE_URL`, `NOTIFICATION_SERVICE_URL`, `PAYMENT_SERVICE_URL` |
| **payment** | `SERVICE_NAME=payment`, `INTERNAL_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`, `APPOINTMENT_SERVICE_URL`, `NOTIFICATION_SERVICE_URL` |
| **notification** | `SERVICE_NAME=notification`, `BREVO_API_KEY`, `BREVO_FROM_EMAIL`, `BREVO_FROM_NAME`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`, *(optional)* `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` |
| **telemedicine** | `SERVICE_NAME=telemedicine`, `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE`, `FRONTEND_URL=https://curemd.vercel.app`, `TELEMEDICINE_DEV_AUTO_SESSION=true`, `APPOINTMENT_SERVICE_URL` |
| **ai-symptom** | `SERVICE_NAME=ai_symptoms`, `GEMINI_API_KEY`, `PATIENT_SERVICE_URL`, `DOCTOR_SERVICE_URL` |

The `*_SERVICE_URL` values are the **Vercel production URLs from Part 4**, e.g.
`APPOINTMENT_SERVICE_URL = https://curemd-appointment-service.vercel.app`.

**Chicken-and-egg:** you don't know the URLs until the projects exist. So:
1. Create all 8 projects with just the shared vars + provider keys (deploys will
   partly work).
2. Then go back into each project → **Settings → Environment Variables**, add the
   `*_SERVICE_URL` + `QSTASH_*` + `ALLOWED_ORIGINS` values.
3. **Settings → Deployments → Redeploy** each one so the new vars take effect.

---

## Part 7 — Stripe webhook

1. Stripe dashboard → **Developers → Webhooks → Add endpoint**.
2. URL: `https://curemd-payment-service.vercel.app/api/payments/webhook`
3. Events: the same ones the old Render endpoint listened for (at minimum
   `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`).
4. Copy the new **Signing secret** (`whsec_...`) → set it as `STRIPE_WEBHOOK_SECRET`
   on the **payment** project → redeploy payment.

---

## Part 8 — Appointment-expiry cron

The old 60-second timer doesn't run on serverless. Set up an external scheduler:

1. Go to **cron-job.org** (free) → create a cronjob.
2. URL: `https://curemd-appointment-service.vercel.app/api/appointments/internal/run-expiry`
3. Method: **POST**
4. Add a request header: `x-internal-secret` = `<INTERNAL_SECRET>`
5. Schedule: every **10 minutes**.

(Vercel Cron also works but on the free plan only runs once/day.)

---

## Part 9 — End-to-end test

1. Open `https://curemd.vercel.app`.
2. Register a patient. Register a doctor.
3. Approve the doctor: MongoDB Atlas → `auth-db` → `users` → set
   `isApproved: true` on the doctor doc. Re-login as the doctor.
4. As the patient: complete profile, book an appointment (payment is skipped via
   `SKIP_PAYMENT=true`).
5. Confirm it appears for the doctor.
6. Check `notification-service` logs in Vercel (**Deployments → Functions**) for a
   `[events]` line — that proves QStash delivered the `appointment.confirmed` event.

If all green: delete the Render services (or leave them stopped as a backup).

---

## Part 10 — Give Abdul visibility (optional)

On the free plan Abdul can't open the dashboard, but he can:
- See deploy status via the Vercel bot's checks on each GitHub commit / PR.
- Trigger a deploy by pushing to `main`.

For full shared access you'd need a Vercel **Pro Team** ($20/user/mo).

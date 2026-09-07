/**
 * Set/repair the MONGODB_URI env var on all 8 backend Vercel projects at once.
 * Originally written to fix a "DBNAME" placeholder; also the fastest way to roll
 * a rotated Atlas password across every project.
 *
 * Run from the repo root — NOTHING is hardcoded, both values come from env:
 *
 *   VERCEL_TOKEN="vcp_xxx" \
 *   MONGO_CRED="user:newpassword@cluster0.xxxxx.mongodb.net" \
 *   node scripts/fix-mongo-uris.mjs            # apply
 *
 *   ...same env... node scripts/fix-mongo-uris.mjs --dry-run   # preview only
 *
 * MONGO_CRED is the "<user>:<password>@<host>" section of the SRV URI (no
 * "mongodb+srv://" prefix, no "/dbname", no "?query"). Optionally override the
 * Vercel team with VERCEL_TEAM_ID and the query tail with MONGO_URI_TAIL.
 *
 * After it prints all-OK, the projects still need a redeploy to pick up the
 * new values (a git push, or `vercel --prod` per project).
 */

const TOKEN = process.env.VERCEL_TOKEN;
if (!TOKEN) {
    console.error('ERROR: set VERCEL_TOKEN');
    process.exit(1);
}
const CRED = process.env.MONGO_CRED;
if (!CRED || !/^[^:/@\s]+:[^@\s]+@[^/@\s]+$/.test(CRED)) {
    console.error('ERROR: set MONGO_CRED to "<user>:<password>@<host>" (no scheme, no /db, no ?query)');
    process.exit(1);
}
const DRY = process.argv.includes('--dry-run');
const TEAM = process.env.VERCEL_TEAM_ID;
if (!TEAM) {
    console.error('ERROR: set VERCEL_TEAM_ID (find it in the Vercel dashboard URL or `vercel teams ls`).');
    process.exit(1);
}
const TAIL = process.env.MONGO_URI_TAIL || 'retryWrites=true&w=majority&appName=Cluster0';

const targets = [
    ['prj_Upgv9fND38OaX0Qai60nmGTUFIXl', 'cure-md-project',     'auth-db'],
    ['prj_pbO0j0Mi6CcSxQdCkPVo54M4OpMT', 'curemd-patient',      'patient_db'],
    ['prj_6YEHLSuOIRfuAjbwMUi4wjBUdwF3', 'curemd-doctor',       'doctor-db'],
    ['prj_Nsy3PjhHKrj6Y6untj8U7sHmUlBp', 'curemd-appointment',  'appointment-db'],
    ['prj_fK4UvPgBbTgnmykuVEQUS4BpZN6j', 'curemd-payment',      'payment-db'],
    ['prj_YSfI2rD1YXnKqfp43RuFrsn03PzO', 'curemd-notification', 'notification-db'],
    ['prj_uzEzEF3S9Y92aaTRzb5D3y5xBmBF', 'curemd-telemedicine', 'telemedicine-db'],
    ['prj_rqlLdwa998i9dD3ssPU9athw4ngH', 'curemd-ai-symptom',   'ai_symptoms'],
];

const H = { Authorization: `Bearer ${TOKEN}` };
let failures = 0;

for (const [pid, name, db] of targets) {
    const value = `mongodb+srv://${CRED}/${db}?${TAIL}`;
    const listRes = await fetch(`https://api.vercel.com/v9/projects/${pid}/env?teamId=${TEAM}`, { headers: H });
    if (!listRes.ok) {
        console.log(`${name}: list failed ${listRes.status} ${await listRes.text()}`);
        failures++;
        continue;
    }
    const body = await listRes.json();
    const envs = (body.envs || body).filter((e) => e.key === 'MONGODB_URI');
    if (!envs.length) {
        console.log(`${name}: no MONGODB_URI entry found`);
        failures++;
        continue;
    }
    // Prefer the production-scoped entry; if none is explicitly production, take all.
    const prod = envs.filter((e) => (e.target || []).includes('production'));
    const toPatch = prod.length ? prod : envs;

    for (const e of toPatch) {
        if (DRY) {
            console.log(`${name} [${(e.target || []).join(',')}] would set -> .../${db}?...`);
            continue;
        }
        const r = await fetch(`https://api.vercel.com/v9/projects/${pid}/env/${e.id}?teamId=${TEAM}`, {
            method: 'PATCH',
            headers: { ...H, 'Content-Type': 'application/json' },
            body: JSON.stringify({ value }),
        });
        if (r.ok) {
            console.log(`${name} [${(e.target || []).join(',')}]  ->  OK  (db: ${db})`);
        } else {
            console.log(`${name}: PATCH failed ${r.status} ${await r.text()}`);
            failures++;
        }
    }
}

console.log(failures ? `\n${failures} failure(s).` : `\nAll env vars updated. Now redeploy (git push) to apply.`);
process.exit(failures ? 1 : 0);

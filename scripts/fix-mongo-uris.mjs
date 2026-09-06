/**
 * One-off: repair the MONGODB_URI env var on all 8 backend Vercel projects.
 * They were saved with the literal placeholder "DBNAME" instead of the real
 * database name. This sets each to the correct value via the Vercel API.
 *
 * Run from the repo root:
 *
 *   VERCEL_TOKEN="vcp_xxx" node scripts/fix-mongo-uris.mjs           # apply
 *   VERCEL_TOKEN="vcp_xxx" node scripts/fix-mongo-uris.mjs --dry-run # preview only
 *
 * After it prints all-OK, the projects still need a redeploy to pick up the
 * new values (a git push does that).
 */

const TOKEN = process.env.VERCEL_TOKEN;
if (!TOKEN) {
    console.error('ERROR: set VERCEL_TOKEN');
    process.exit(1);
}
const DRY = process.argv.includes('--dry-run');
const TEAM = 'team_Nb2l3Jww2VYJVceMmxfIzf6k';
const CRED = 'komotech329_db_user:komotechpass123@cluster0.lpkysyi.mongodb.net';
const TAIL = 'retryWrites=true&w=majority&appName=Cluster0';

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

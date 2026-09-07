/**
 * One-off: seed a production admin + superadmin into auth-db (MongoDB Atlas).
 *
 * Uses the real auth-service User model so the password hash (bcrypt, 12 rounds)
 * and the isApproved pre-save hook match what /api/auth/login expects.
 * Safe to re-run — skips any account whose email already exists.
 *
 * Run from anywhere (paths resolve relative to this file):
 *
 *   MONGODB_URI="<auth-db connection string>" node scripts/seed-admin-atlas.mjs
 *
 * ADMIN_* / SUPERADMIN_* env vars override the defaults below.
 * Passwords must be >= 8 chars (schema minimum).
 */

import dns from 'node:dns';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

// Resolve everything relative to this file, not the CWD, so the script can be
// run from anywhere. mongoose + the User model both come from auth-service.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const AUTH_SRC = path.resolve(HERE, '../services/auth-service/src');
const authRequire = createRequire(path.join(AUTH_SRC, 'noop.js'));
const mongoose = (await import(pathToFileURL(authRequire.resolve('mongoose')).href)).default;

// The user's machine has had SRV lookups fail against the default resolver
// before (see DEPLOY_STATUS.md §8) — pin public DNS so mongodb+srv:// resolves.
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch { /* ignore */ }

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error('ERROR: set MONGODB_URI to the auth-db connection string.');
    process.exit(1);
}

// Passwords are NOT hardcoded — supply them at run time:
//   SUPERADMIN_PASSWORD=... ADMIN_PASSWORD=... MONGODB_URI=... node scripts/seed-admin-atlas.mjs
if (!process.env.SUPERADMIN_PASSWORD || !process.env.ADMIN_PASSWORD) {
    console.error('ERROR: set SUPERADMIN_PASSWORD and ADMIN_PASSWORD (min 8 chars each).');
    process.exit(1);
}

const accounts = [
    {
        role: 'superadmin',
        email: process.env.SUPERADMIN_EMAIL || 'superadmin.test@curemd.dev',
        password: process.env.SUPERADMIN_PASSWORD,
        firstName: 'Super',
        lastName: 'Admin',
    },
    {
        role: 'admin',
        email: process.env.ADMIN_EMAIL || 'admin.test@curemd.dev',
        password: process.env.ADMIN_PASSWORD,
        firstName: 'Platform',
        lastName: 'Admin',
    },
];

const userModelUrl = pathToFileURL(path.join(AUTH_SRC, 'models/User.js')).href;
const { default: User } = await import(userModelUrl);

await mongoose.connect(MONGODB_URI);
console.log(`connected: ${mongoose.connection.name}`);

for (const acc of accounts) {
    const existing = await User.findOne({ email: acc.email.toLowerCase() }).select('_id role');
    if (existing) {
        console.log(`skip   ${acc.role.padEnd(10)} ${acc.email} — already exists (role: ${existing.role})`);
        continue;
    }
    const user = new User({
        firstName: acc.firstName,
        lastName: acc.lastName,
        email: acc.email,
        password: acc.password,
        role: acc.role,
        isActive: true,
        isVerified: true,
    });
    await user.save();
    console.log(`create ${acc.role.padEnd(10)} ${acc.email}  (_id ${user._id})`);
}

await mongoose.disconnect();
console.log('done. Log in at https://curemd-frontend.vercel.app/login then open /admin');

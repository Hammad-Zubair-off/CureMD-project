/**
 * One-off: set up everything needed to test the telemedicine (Agora) video call.
 *
 * Creates (idempotent — safe to re-run):
 *   - a patient login           (auth-db)
 *   - an approved doctor login  (auth-db)  + doctor profile (doctor-db)
 *   - a CONFIRMED appointment between them, dated TODAY (appointment-db)
 *
 * The telemedicine session itself is created when the doctor clicks
 * "Start Session", so it is not seeded here.
 *
 * Run from anywhere:
 *   MONGODB_URI="mongodb+srv://USER:PASS@cluster0.lpkysyi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0" \
 *   node scripts/seed-videocall-test.mjs
 *
 * (no database name in the URI — the script targets auth-db / doctor-db /
 *  appointment-db itself)
 */

import dns from 'node:dns';
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch { /* ignore */ }
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const req = createRequire('C:/Users/Lenovo/Desktop/CureMD-project/services/auth-service/src/x.js');
const { MongoClient, ObjectId } = await import(pathToFileURL(req.resolve('mongodb')).href);
const bcrypt = (await import(pathToFileURL(req.resolve('bcryptjs')).href)).default;

const URI = process.env.MONGODB_URI;
if (!URI) { console.error('ERROR: set MONGODB_URI (no db name in it)'); process.exit(1); }

const PATIENT = { email: 'patient.test@curemd.dev', password: 'PatientTest123!', firstName: 'Pat', lastName: 'Tester' };
const DOCTOR  = { email: 'doctor.test@curemd.dev',  password: 'DoctorTest123!',  firstName: 'Doc', lastName: 'Tester' };

const now = new Date();
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const todayName = WEEKDAYS[now.getDay()];
const apptDate = new Date(now); apptDate.setHours(10, 0, 0, 0);

const c = new MongoClient(URI, { serverSelectionTimeoutMS: 15000 });
await c.connect();
const authUsers = c.db('auth-db').collection('users');
const doctors   = c.db('doctor-db').collection('doctors');
const appts     = c.db('appointment-db').collection('appointments');

async function ensureUser(spec, role) {
    let u = await authUsers.findOne({ email: spec.email });
    if (!u) {
        const hash = await bcrypt.hash(spec.password, 12);
        const doc = {
            firstName: spec.firstName, lastName: spec.lastName, email: spec.email,
            password: hash, role,
            isActive: true, isApproved: true, isVerified: true,
            createdAt: new Date(), updatedAt: new Date(),
        };
        const r = await authUsers.insertOne(doc);
        u = { _id: r.insertedId, ...doc };
        console.log(`created ${role}: ${spec.email}`);
    } else {
        await authUsers.updateOne({ _id: u._id }, { $set: { role, isActive: true, isApproved: true } });
        console.log(`exists  ${role}: ${spec.email} (ensured active + approved)`);
    }
    return u;
}

const patient = await ensureUser(PATIENT, 'patient');
const doctor  = await ensureUser(DOCTOR, 'doctor');

// doctor profile
const profile = {
    userId: String(doctor._id),
    title: 'Dr.', firstName: DOCTOR.firstName, lastName: DOCTOR.lastName,
    specialization: 'General Practice',
    yearsOfExperience: 8,
    licenseNumber: 'TEST-LIC-VIDEOCALL-001',
    consultationFee: 90,
    consultationTypes: { videoCall: true, audioCall: false, chat: false },
    availability: [{ day: todayName, slots: [{ startTime: '09:00', endTime: '17:00' }] }],
    isActive: true, rating: 5, totalReviews: 1,
    updatedAt: new Date(),
};
const existingProfile = await doctors.findOne({ userId: String(doctor._id) });
if (existingProfile) {
    await doctors.updateOne({ _id: existingProfile._id }, { $set: profile });
    console.log('doctor profile: updated');
} else {
    await doctors.insertOne({ ...profile, createdAt: new Date() });
    console.log('doctor profile: created');
}

// confirmed appointment dated today — drop any prior test one so re-runs stay "today"
await appts.deleteMany({ patientEmail: PATIENT.email, doctorId: String(doctor._id) });
const appt = {
    patientId: String(patient._id),
    patientFirstName: PATIENT.firstName, patientLastName: PATIENT.lastName,
    patientFullName: `${PATIENT.firstName} ${PATIENT.lastName}`,
    patientEmail: PATIENT.email, patientPhone: '+10000000000',
    doctorId: String(doctor._id),
    doctorFullName: `Dr. ${DOCTOR.firstName} ${DOCTOR.lastName}`,
    specialty: 'General Practice',
    consultationFee: 90,
    appointmentDate: apptDate,
    timeSlot: '10:00 - 10:30',
    reason: 'Video call feature test',
    sharingMode: 'none',
    status: 'confirmed',
    statusHistory: [
        { status: 'pending',   changedBy: 'patient', changedAt: new Date(now.getTime() - 60000) },
        { status: 'confirmed', changedBy: 'system',  changedAt: new Date() },
    ],
    paymentStatus: 'unpaid',
    paymentId: null,
    createdAt: new Date(), updatedAt: new Date(),
};
const r = await appts.insertOne(appt);
console.log(`appointment: created ${r.insertedId}  (${todayName} ${apptDate.toISOString()})  status=confirmed`);

await c.close();
console.log(`
DONE. App: https://curemd-frontend.vercel.app

  Patient : ${PATIENT.email}  /  ${PATIENT.password}
  Doctor  : ${DOCTOR.email}  /  ${DOCTOR.password}

To test the video call (use two browsers / one normal + one incognito):
  1. Doctor window  -> log in -> Telemedicine -> today's appointment -> Start Session -> allow camera
  2. Patient window -> log in -> Telemedicine -> today's appointment -> Join -> allow camera
`);

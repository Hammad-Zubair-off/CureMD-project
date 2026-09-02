import Appointment from '../models/Appointment.js';
import { logger } from './logger.js';

// ─ Appointment Expirer ─
// Runs every 60 seconds. Finds confirmed appointments whose consultation
// time has passed and transitions them to status 'past'.
//
// How the end datetime is computed:
// - appointmentDate is stored as local midnight in UTC
//   e.g. "2026-04-20T18:30:00Z" = midnight UTC+5:30 on April 21 local
// - timeSlot is in local time, e.g. "15:00 - 15:30"
// - endUtc = appointmentDate + (endHours * 3600 + endMinutes * 60) * 1000
// This is timezone-agnostic: local midnight (in UTC) + local hours = correct UTC end.

/**
 * Parses the end time from a timeSlot string.
 * @param {string} timeSlot - e.g. "09:30 - 10:00" or "15:00 - 15:30"
 * @returns {{ hours: number, minutes: number } | null}
 */
const parseEndTime = (timeSlot) => {
    if (!timeSlot) return null;
    const endPart = timeSlot.split('-').pop()?.trim(); // "10:00"
    if (!endPart || !/^\d{1,2}:\d{2}$/.test(endPart)) return null;
    const [hours, minutes] = endPart.split(':').map(Number);
    return { hours, minutes };
};

/**
 * Returns the UTC millisecond timestamp of when an appointment ends.
 * appointmentDate stores local midnight in UTC, timeSlot is in local time.
 * Adding local hours/minutes to local midnight (in UTC) gives UTC end time.
 */
const getEndUtcMs = (appointment) => {
    const baseMs = new Date(appointment.appointmentDate).getTime();
    const end = parseEndTime(appointment.timeSlot);
    if (!end) return baseMs;
    return baseMs + (end.hours * 3600 + end.minutes * 60) * 1000;
};

/**
 * @desc  One expiry tick — finds all confirmed appointments whose
 *        end datetime has passed and bulk-updates them to 'past'.
 *        Exported so a serverless cron endpoint can invoke it directly.
 */
export const runExpiryTick = async () => {
    try {
        const now = Date.now();

        // Candidate fetch: confirmed appointments whose date (ignoring time) is <= now.
        // We over-fetch slightly because we can't filter on timeSlot in MongoDB,
        // then refine in JS to those whose end time has truly passed.
        const candidates = await Appointment.find(
            {
                status: 'confirmed',
                // appointmentDate <= now (catches all past days + today)
                appointmentDate: { $lte: new Date(now) },
            },
            { _id: 1, appointmentDate: 1, timeSlot: 1 }
        ).lean();

        if (candidates.length === 0) return;

        // Refine: only those whose end time has truly passed
        const expiredIds = candidates
            .filter(a => getEndUtcMs(a) <= now)
            .map(a => a._id);

        if (expiredIds.length === 0) return;

        // Bulk update to 'past'
        const result = await Appointment.updateMany(
            { _id: { $in: expiredIds }, status: 'confirmed' }, // guard: still confirmed
            {
                $set: { status: 'past' },
                $push: {
                    statusHistory: {
                        status: 'past',
                        changedBy: 'system',
                        changedAt: new Date(),
                    },
                },
            }
        );

        if (result.modifiedCount > 0) {
            logger.info(`[appointment-expirer] ${result.modifiedCount} appointment(s) transitioned to 'past'`);
        }
    } catch (err) {
        // Non-fatal — log and continue; it will retry on the next tick
        logger.error(`[appointment-expirer] Tick failed: ${err.message}`);
    }
};

/**
 * @desc  Starts the appointment expirer scheduler.
 *        Runs immediately on startup, then every 60 seconds.
 *        Call once after DB connects.
 */
export const startAppointmentExpirer = () => {
    logger.info('[appointment-expirer] Started — checking every 60s');
    // Run once immediately on startup to catch any missed transitions
    runExpiryTick();
    setInterval(runExpiryTick, 60 * 1000);
};

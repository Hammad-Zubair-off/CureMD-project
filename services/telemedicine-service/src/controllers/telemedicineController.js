import { Session } from '../models/Session.js';
import { generateRtcToken } from '../utils/agoraTokenGenerator.js';
import { logger } from '../utils/logger.js';
import { appointmentClient } from '../config/services.js';

const DEV_AUTO_SESSION = process.env.TELEMEDICINE_DEV_AUTO_SESSION === 'true';

const buildSessionJoinPayload = (session, { token, uid }) => ({
  sessionId: session._id,
  appointmentId: session.appointmentId,
  channelName: session.channelName,
  agoraAppId: process.env.AGORA_APP_ID,
  token,
  uid,
  status: session.status,
  startedAt: session.startedAt,
  endedAt: session.endedAt,
  durationMinutes: session.durationMinutes,
});

const refreshSessionTokens = async (session) => {
  const doctorToken = generateRtcToken(session.channelName, 1, 'publisher');
  const patientToken = generateRtcToken(session.channelName, 2, 'publisher');
  session.doctorToken = doctorToken;
  session.patientToken = patientToken;
  await session.save();
  return { doctorToken, patientToken };
};

const createSessionForAppointment = async ({ appointmentId, doctorId, patientId }) => {
  const channelName = `appt_${appointmentId}`;
  const frontendBase = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
  const patientJoinUrl = `${frontendBase}/telemedicine/join/${channelName}`;

  const session = await Session.create({
    appointmentId,
    channelName,
    doctorId,
    patientId,
    patientJoinUrl,
    status: 'created',
  });

  await refreshSessionTokens(session);
  logger.info(`Session created: ${session._id} for appointment ${appointmentId}`);
  return session;
};

const ensureSessionForAppointment = async (appointmentId, req) => {
  let session = await Session.findOne({ appointmentId });

  if (session && session.status === 'ended') {
    session.status = 'created';
    session.startedAt = null;
    session.endedAt = null;
    session.durationMinutes = null;
    await session.save();
    await refreshSessionTokens(session);
    logger.info(`Session ${session._id} reset from 'ended' → 'created' for re-use`);
    return session;
  }

  if (session) {
    await refreshSessionTokens(session);
    return session;
  }

  if (!DEV_AUTO_SESSION) {
    return null;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  let apptRes;
  try {
    apptRes = await appointmentClient.get(`/api/appointments/${appointmentId}`, {
      headers: { Authorization: authHeader },
    });
  } catch (err) {
    // A 4xx from the peer is a definitive answer — the appointment is gone or
    // this caller can't have it — so there's genuinely no session to create:
    // return null and let the caller answer 404. A missing response (peer down /
    // timeout / 5xx) is transient: rethrow so the caller surfaces a 5xx instead
    // of a misleading "No session found".
    const peerStatus = err.response?.status;
    if (peerStatus && peerStatus >= 400 && peerStatus < 500) {
      return null;
    }
    logger.error(`ensureSessionForAppointment: appointment lookup failed: ${err.message}`);
    throw err;
  }

  const appointment = apptRes.data?.appointment;
  if (!appointment) return null;

  if (appointment.status !== 'confirmed') {
    return null;
  }

  const requesterId = String(req.user.id);
  const isPatient = req.user.role === 'patient' && String(appointment.patientId) === requesterId;
  const isDoctor = req.user.role === 'doctor' && String(appointment.doctorId) === requesterId;

  if (!isPatient && !isDoctor) {
    return null;
  }

  session = await createSessionForAppointment({
    appointmentId,
    doctorId: appointment.doctorId,
    patientId: appointment.patientId,
  });

  return session;
};

// POST /api/telemedicine/session/create
// Called when doctor clicks "Start Session"
// Creates (or retrieves existing) session, generates Agora token for doctor
export const createSession = async (req, res, next) => {
  try {
    const { appointmentId } = req.body;
    const doctorId = req.user.id;

    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        error: 'appointmentId is required',
      });
    }

    let apptRes;
    try {
      apptRes = await appointmentClient.get(`/api/appointments/${appointmentId}`, {
        headers: { Authorization: req.headers.authorization },
      });
    } catch (err) {
      // axios throws on any non-2xx. A response with a 4xx status is the peer
      // telling us this caller can't have this appointment — surface that as-is
      // instead of a misleading "try again" 503. Only a missing response (peer
      // down / timeout / 5xx) is a real transient failure.
      const peerStatus = err.response?.status;
      if (peerStatus === 403 || peerStatus === 401) {
        return res.status(403).json({ success: false, error: 'You are not assigned to this appointment.' });
      }
      if (peerStatus === 404 || peerStatus === 400) {
        return res.status(404).json({ success: false, error: 'Appointment not found.' });
      }
      logger.error(`createSession: appointment lookup failed: ${err.message}`);
      return res.status(503).json({
        success: false,
        error: 'Could not verify the appointment right now. Please try again in a moment.',
      });
    }

    const appointment = apptRes.data?.appointment;
    if (!appointment || String(appointment.doctorId) !== String(doctorId)) {
      return res.status(403).json({
        success: false,
        error: 'You are not assigned to this appointment.',
      });
    }

    // Bind the session to the appointment's patient — never trust a
    // patientId supplied in the request body.
    const patientId = String(appointment.patientId);

    // Check if session already exists (doctor re-clicking start)
    let session = await Session.findOne({ appointmentId });

    if (session && session.status === 'ended') {
      session.status = 'created';
      session.startedAt = null;
      session.endedAt = null;
      session.durationMinutes = null;
      await session.save();
      logger.info(`Session ${session._id} reset from 'ended' → 'created' for re-use`);
    }

    if (!session) {
      session = await createSessionForAppointment({ appointmentId, doctorId, patientId });
    } else {
      await refreshSessionTokens(session);
    }

    const doctorToken = session.doctorToken;

    return res.status(200).json({
      success: true,
      data: {
        sessionId: session._id,
        channelName: session.channelName,
        agoraAppId: process.env.AGORA_APP_ID,
        token: doctorToken,
        uid: 1,
        patientJoinUrl: session.patientJoinUrl,
        status: session.status,
      },
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/telemedicine/session/:sessionId/start
// Called when doctor actually joins Agora and video starts
export const markSessionActive = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const requesterId = String(req.user.id);
    const isDoctorOwner = String(session.doctorId) === requesterId;
    const isSuperAdmin = req.user.role === 'superadmin';
    if (!isDoctorOwner && !isSuperAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Only the assigned doctor can start this session.',
      });
    }

    session.status = 'active';
    //session.startedAt = new Date();
    if (!session.startedAt) session.startedAt = new Date();
    await session.save();

    logger.info(`Session ${req.params.sessionId} is now ACTIVE`);
    return res.status(200).json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/telemedicine/session/:sessionId/end
// Called when doctor ends the call
export const endSession = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const requesterId = String(req.user.id);
    const isDoctorOwner = String(session.doctorId) === requesterId;
    const isSuperAdmin = req.user.role === 'superadmin';
    if (!isDoctorOwner && !isSuperAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Only the assigned doctor can end this session.',
      });
    }

    session.status = 'ended';
    session.endedAt = new Date();

    if (session.startedAt) {
      session.durationMinutes = Math.round(
        (session.endedAt - session.startedAt) / 60000
      );
    }

    await session.save();
    logger.info(`Session ${req.params.sessionId} ended. Duration: ${session.durationMinutes} mins`);
    return res.status(200).json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
};

// GET /api/telemedicine/session/appointment/:appointmentId
// Get session info for an appointment
export const getSessionByAppointment = async (req, res, next) => {
  try {
    let session = await Session.findOne({ appointmentId: req.params.appointmentId });

    if (!session) {
      session = await ensureSessionForAppointment(req.params.appointmentId, req);
    }

    if (!session) {
      return res.status(404).json({ success: false, error: 'No session found' });
    }

    const requesterId = String(req.user.id);
    const role = req.user.role;
    const isDoctorOwner = role === 'doctor' && String(session.doctorId) === requesterId;
    const isPatientOwner = role === 'patient' && String(session.patientId) === requesterId;
    const isSuperAdmin = role === 'superadmin';

    if (!isDoctorOwner && !isPatientOwner && !isSuperAdmin) {
      return res.status(403).json({
        success: false,
        error: 'You are not allowed to access this session.',
      });
    }

    // Mint a fresh role token for the response each request (resilient against
    // expiry). This is a plain GET/poll target, so do NOT rewrite the stored
    // token on every call — that made the endpoint non-idempotent and caused
    // VersionError churn under concurrent polling. Persist only when the stored
    // token is missing, and via an atomic updateOne so no version conflict.
    let token = null;
    let uid = null;

    if (isDoctorOwner) {
      token = generateRtcToken(session.channelName, 1, 'publisher');
      uid = 1;
      if (!session.doctorToken) {
        session.doctorToken = token;
        await Session.updateOne({ _id: session._id }, { $set: { doctorToken: token } });
      }
    } else if (isPatientOwner) {
      token = generateRtcToken(session.channelName, 2, 'publisher');
      uid = 2;
      if (!session.patientToken) {
        session.patientToken = token;
        await Session.updateOne({ _id: session._id }, { $set: { patientToken: token } });
      }
    }

    return res.status(200).json({
      success: true,
      data: buildSessionJoinPayload(session, { token, uid }),
    });
  } catch (err) {
    next(err);
  }
};
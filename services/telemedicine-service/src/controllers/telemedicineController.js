import { Session } from '../models/Session.js';
import { generateRtcToken } from '../utils/agoraTokenGenerator.js';
import { logger } from '../utils/logger.js';

// POST /api/telemedicine/session/create
// Called when doctor clicks "Start Session"
// Creates (or retrieves existing) session, generates Agora token for doctor
export const createSession = async (req, res, next) => {
  try {
    const { appointmentId, patientId } = req.body;
    const doctorId = req.user.id;

    if (!appointmentId || !patientId) {
      return res.status(400).json({
        success: false,
        error: 'appointmentId and patientId are required',
      });
    }

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
      // Unique channel name tied to this appointment
      const channelName = `appt_${appointmentId}`;

      // Patient join URL — patient will open this and join with their own token
      const patientJoinUrl = `${process.env.FRONTEND_URL}/telemedicine/join/${channelName}`;

      session = await Session.create({
        appointmentId,
        channelName,
        doctorId,
        patientId,
        patientJoinUrl,
        status: 'created',
      });

      logger.info(`Session created: ${session._id} for appointment ${appointmentId}`);
    }

    // Generate fresh doctor token (UID 1 = doctor by convention)
    // Regenerated every time in case the previous one expired
    const doctorToken = generateRtcToken(session.channelName, 1, 'publisher');
    const patientToken = generateRtcToken(session.channelName, 2, 'publisher');

    session.doctorToken = doctorToken;
    session.patientToken = patientToken;
    await session.save();

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
    const session = await Session.findOne({ appointmentId: req.params.appointmentId });
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

    // Refresh role token each request for resilience against expiry.
    let token = null;
    let uid = null;

    if (isDoctorOwner) {
      token = generateRtcToken(session.channelName, 1, 'publisher');
      uid = 1;
      session.doctorToken = token;
      await session.save();
    } else if (isPatientOwner) {
      token = generateRtcToken(session.channelName, 2, 'publisher');
      uid = 2;
      session.patientToken = token;
      await session.save();
    }

    //return res.status(200).json({ success: true, data: session });

    return res.status(200).json({
      success: true,
      data: {
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
      },
    });
  } catch (err) {
    next(err);
  }
};
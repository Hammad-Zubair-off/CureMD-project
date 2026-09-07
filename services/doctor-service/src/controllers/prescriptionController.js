import {Prescription} from '../models/Prescription.js';
import {logger} from '../utils/logger.js';

const APPOINTMENT_SERVICE_URL = process.env.APPOINTMENT_SERVICE_URL || 'http://appointment-service:3004';

// POST /api/doctors/prescriptions

export const savePrescription = async (req, res, next) => {
    try {
        const doctorId = req.user.id;
        const { appointmentId, sessionId, medications, diagnosis, instructions } = req.body;

        if (!appointmentId) {
            return res.status(400).json({ success: false, message: 'appointmentId is required.' });
        }
        if (!medications?.length) {
            return res.status(400).json({ success: false, message: 'At least one medication is required.' });
        }

        let apptRes;
        try {
            apptRes = await fetch(`${APPOINTMENT_SERVICE_URL}/api/appointments/${appointmentId}`, {
                headers: { Authorization: req.headers.authorization },
            });
        } catch (err) {
            logger.error(`savePrescription: appointment lookup failed: ${err.message}`);
            return res.status(503).json({
                success: false,
                message: 'Could not verify the appointment right now. Please try again in a moment.',
            });
        }
        const apptData = await apptRes.json().catch(() => ({}));

        if (!apptRes.ok || String(apptData.appointment?.doctorId) !== String(doctorId)) {
            return res.status(403).json({ success: false, message: 'You are not assigned to this appointment.' });
        }

        // Bind the prescription to the appointment's patient — never trust a
        // patientId from the request body.
        const patientId = String(apptData.appointment.patientId);

        const prescription = await Prescription.findOneAndUpdate(
            { appointmentId },
            {
                $set: {
                    doctorId,
                    patientId,
                    sessionId: sessionId || 'manual-entry',
                    medications,
                    diagnosis:    diagnosis    || '',
                    instructions: instructions || '',
                    status: 'draft',
                },
            },
            { upsert: true, new: true, runValidators: true }
        );

        return res.status(200).json({ success: true, data: prescription });
    } catch (err) {
        logger.error('savePrescription error:', err);
        return next(err);
    }
};


// POST /api/doctors/prescriptions/:id/issue

export const issuePrescription = async (req, res, next) => {
    try {
        const doctorId = req.user.id;
        const { id } = req.params;

        const prescription = await Prescription.findOne({ _id: id, doctorId });
        if (!prescription) {
            return res.status(404).json({ success: false, message: 'Prescription not found.' });
        }
        if (prescription.status === 'issued') {
            return res.status(400).json({ success: false, message: 'Prescription already issued.' });
        }

        prescription.status   = 'issued';
        prescription.issuedAt = new Date();
        await prescription.save();

        return res.status(200).json({ success: true, data: prescription });
    } catch (err) {
        logger.error('issuePrescription error:', err);
        return next(err);
    }
};

// GET /api/doctors/prescriptions/appointment/:appointmentId

export const getPrescriptionByAppointment = async (req, res, next) => {
    try {
        const doctorId = req.user.id;
        const { appointmentId } = req.params;

        const prescription = await Prescription.findOne({ appointmentId, doctorId });
        if (!prescription) {
            return res.status(404).json({ success: false, data: null });
        }
        return res.status(200).json({ success: true, data: prescription });
    } catch (err) {
        logger.error('getPrescriptionByAppointment error:', err);
        return next(err);
    }
};

// GET /api/doctors/prescriptions/patient/:patientId

export const getPrescriptionsByPatient = async (req, res, next) => {
    try {
        const { patientId } = req.params;
        const { appointmentId } = req.query;

        if (req.user.role === 'patient' && req.user.id !== patientId) {
            return res.status(403).json({ success: false, message: 'You are not authorized to view these prescriptions.' });
        }

        const query = { patientId, status: 'issued' };
        if (appointmentId) {
            query.appointmentId = appointmentId;
        }
        // A doctor may only see prescriptions they themselves issued.
        if (req.user.role === 'doctor') {
            query.doctorId = req.user.id;
        }

        const prescriptions = await Prescription.find(query).sort({ issuedAt: -1 });
        return res.status(200).json({ success: true, data: prescriptions });
    } catch (err) {
        logger.error('getPrescriptionsByPatient error:', err);
        return next(err);
    }
};
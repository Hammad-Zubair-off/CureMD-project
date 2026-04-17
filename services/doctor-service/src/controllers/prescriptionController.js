import {Prescription} from '../models/Prescription.js';
import {logger} from '../utils/logger.js';

// POST /api/doctors/prescriptions

export const savePrescription = async (req, res) => {
    try {
        const doctorId = req.user.id;
        const { appointmentId, patientId, sessionId, medications, diagnosis, instructions } = req.body;

        if (!medications?.length) {
            return res.status(400).json({ success: false, message: 'At least one medication is required.' });
        }

        const prescription = await Prescription.findOneAndUpdate(
            { appointmentId },
            {
                $set: {
                    doctorId,
                    patientId,
                    sessionId,
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
        return res.status(500).json({ success: false, message: 'Failed to save prescription.' });
    }
};


// POST /api/doctors/prescriptions/:id/issue

export const issuePrescription = async (req, res) => {
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
        return res.status(500).json({ success: false, message: 'Failed to issue prescription.' });
    }
};

// GET /api/doctors/prescriptions/appointment/:appointmentId

export const getPrescriptionByAppointment = async (req, res) => {
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
        return res.status(500).json({ success: false, message: 'Failed to fetch prescription.' });
    }
};

// GET /api/doctors/prescriptions/patient/:patientId

export const getPrescriptionsByPatient = async (req, res) => {
    try {
        const { patientId } = req.params;
        const prescriptions = await Prescription.find({ patientId, status: 'issued' }).sort({ issuedAt: -1 });
        return res.status(200).json({ success: true, data: prescriptions });
    } catch (err) {
        logger.error('getPrescriptionsByPatient error:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch prescriptions.' });
    }
};
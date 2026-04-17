// ── Helpers ───────────────────────────────────────────────────────────────────
const isMongoId = (str) => /^[a-f\d]{24}$/i.test(str);

const sendErrors = (res, errors) =>
    res.status(422).json({ success: false, errors });

// ── Validators ────────────────────────────────────────────────────────────────

/**
 * Validates POST /prescriptions body.
 * Checks all required fields and the medications array structure.
 */
export const savePrescriptionValidator = (req, res, next) => {
    const errors = [];
    const { appointmentId, patientId, sessionId, medications, diagnosis, instructions } = req.body;

    // ── Required ID fields ────────────────────────────────────────────────────
    if (!appointmentId || !isMongoId(appointmentId))
        errors.push({ field: 'appointmentId', message: 'Valid appointmentId is required.' });

    if (!patientId || !isMongoId(patientId))
        errors.push({ field: 'patientId', message: 'Valid patientId is required.' });

    if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim())
        errors.push({ field: 'sessionId', message: 'sessionId is required.' });

    // ── Medications array ─────────────────────────────────────────────────────
    if (!Array.isArray(medications) || medications.length === 0) {
        errors.push({ field: 'medications', message: 'At least one medication is required.' });
    } else {
        medications.forEach((med, idx) => {
            if (!med.name?.trim())
                errors.push({ field: `medications[${idx}].name`, message: 'Medication name is required.' });

            if (!med.dosage?.trim())
                errors.push({ field: `medications[${idx}].dosage`, message: 'Dosage is required.' });

            if (!med.frequency?.trim())
                errors.push({ field: `medications[${idx}].frequency`, message: 'Frequency is required.' });

            if (!med.duration?.trim())
                errors.push({ field: `medications[${idx}].duration`, message: 'Duration is required.' });

            // notes is optional — only validate type if provided
            if (med.notes !== undefined && typeof med.notes !== 'string')
                errors.push({ field: `medications[${idx}].notes`, message: 'Notes must be a string.' });
        });
    }

    // ── Optional string fields ────────────────────────────────────────────────
    if (diagnosis !== undefined && typeof diagnosis !== 'string')
        errors.push({ field: 'diagnosis', message: 'Diagnosis must be a string.' });

    if (instructions !== undefined && typeof instructions !== 'string')
        errors.push({ field: 'instructions', message: 'Instructions must be a string.' });

    if (errors.length) return sendErrors(res, errors);
    next();
};

/**
 * Validates any route that has a MongoDB :id param.
 * Pass the param name: mongoIdParam('id'), mongoIdParam('appointmentId'), etc.
 */
export const mongoIdParam = (paramName) => (req, res, next) => {
    const value = req.params[paramName];
    if (!value || !isMongoId(value)) {
        return sendErrors(res, [{ field: paramName, message: `Invalid ${paramName}.` }]);
    }
    next();
};
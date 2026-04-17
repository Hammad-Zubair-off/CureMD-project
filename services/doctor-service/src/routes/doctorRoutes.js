import { Router } from 'express';
import { protect, authorize, requireApproved } from '../middleware/auth.js';

import {
    createProfile,
    getMyProfile,
    updateProfile,
    getDoctorById,
    searchDoctors,
    getSpecializations,
} from '../controllers/profileController.js';
import {
    setAvailability,
    getMyAvailability,
    getDoctorAvailability,
} from '../controllers/availabilityController.js';
import {
    getPendingDoctors,
    getAllDoctors,
    toggleActive,
    updateRating,
} from '../controllers/adminController.js';

import {
    savePrescription,
    issuePrescription,
    getPrescriptionByAppointment,
    getPrescriptionsByPatient,
} from '../controllers/prescriptionController.js';

import {
    savePrescriptionValidator,
    mongoIdParam as prescriptionMongoIdParam,
} from '../validators/prescriptionValidator.js';

import {
    createProfileValidator,
    updateProfileValidator,
    availabilityValidator,
    searchValidator,
    mongoIdParam,
} from '../validators/doctorValidator.js';

const router = Router();


// GET /api/doctors   
// Search & filter approved doctors
router.get('/', searchValidator, searchDoctors);

// GET /api/doctors/specializations    
// Distinct specializations for search dropdown
router.get('/specializations', getSpecializations);


// POST /api/doctors/profile           
// Register own profile (called once after signup)
router.post('/profile', protect, authorize('doctor'), createProfileValidator, createProfile);

// GET  /api/doctors/profile/me        
// View own full profile
router.get('/profile/me', protect, authorize('doctor'), getMyProfile);

// PUT  /api/doctors/profile          
// Update own profile
router.put('/profile', protect, authorize('doctor'), requireApproved, updateProfileValidator, updateProfile);


// GET  /api/doctors/availability/me   
// View own weekly schedule
router.get('/availability/me', protect, authorize('doctor'), getMyAvailability);

// PUT  /api/doctors/availability      
// Replace full weekly availability schedule
router.put('/availability', protect, authorize('doctor'), requireApproved, availabilityValidator, setAvailability);


// GET  /api/doctors/admin/pending     
// Doctors awaiting approval
router.get('/admin/pending', protect, authorize('admin', 'superadmin'), getPendingDoctors);

// GET  /api/doctors/admin/all         
// All doctors with optional filters
router.get('/admin/all', protect, authorize('admin', 'superadmin'), getAllDoctors);

// PATCH /api/doctors/admin/:id/toggle-active
router.patch('/admin/:id/toggle-active', protect, authorize('admin', 'superadmin'), mongoIdParam('id'), toggleActive);

// PATCH /api/doctors/admin/:id/rating  
// (called internally by appointment-service)
router.patch('/admin/:id/rating', protect, authorize('admin', 'superadmin'), mongoIdParam('id'), updateRating);

// GET /api/doctors/:id/availability  
// Public slots for a doctor (appointment booking flow)
router.get('/:id/availability', mongoIdParam('id'), getDoctorAvailability);

// GET /api/doctors/:id                
// Public single doctor full profile (detail page)
router.get('/:id', mongoIdParam('id'), getDoctorById);

// PRESCRIPTIONS  (role: doctor)

// POST   /api/doctors/prescriptions    Save / update draft
router.post(
    '/prescriptions',
    protect, authorize('doctor'), requireApproved,
    savePrescriptionValidator,
    savePrescription
);

// POST   /api/doctors/prescriptions/:id/issue  Issue the prescription
router.post(
    '/prescriptions/:id/issue',
    protect, authorize('doctor'), requireApproved,
    prescriptionMongoIdParam('id'),
    issuePrescription
);

// GET    /api/doctors/prescriptions/appointment/:appointmentId
router.get(
    '/prescriptions/appointment/:appointmentId',
    protect, authorize('doctor'),
    prescriptionMongoIdParam('appointmentId'),
    getPrescriptionByAppointment
);

// GET    /api/doctors/prescriptions/patient/:patientId  (doctor or patient role)
router.get(
    '/prescriptions/patient/:patientId',
    protect, authorize('doctor', 'patient', 'admin'),
    prescriptionMongoIdParam('patientId'),
    getPrescriptionsByPatient
);


export default router;
import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { createPaymentIntent, refundPayment, getPaymentByAppointment, confirmPaymentFromFrontend, getAllPayments, } from '../controllers/paymentController.js';

const router = Router();

// NOTE: POST /api/payments/webhook is mounted in src/app.js *before* the JSON
// body parser so Stripe's raw payload survives for signature verification.

// Patient creates a payment intent (triggers Stripe checkout flow)
router.post('/create-intent', protect, authorize('patient'), createPaymentIntent);

router.get('/appointment/:appointmentId', protect, authorize('patient'), getPaymentByAppointment);

router.post('/confirm-payment', protect, authorize('patient'), confirmPaymentFromFrontend);

router.post('/:id/refund', protect, authorize('admin'), refundPayment);

// Admin — list all payments with optional status filter
router.get('/admin/all', protect, authorize('admin', 'superadmin'), getAllPayments);

export default router;

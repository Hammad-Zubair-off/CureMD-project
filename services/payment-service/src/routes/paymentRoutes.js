import { Router } from 'express';
import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { createPaymentIntent, stripeWebhook, refundPayment, getPaymentByAppointment, confirmPaymentFromFrontend, getAllPayments, } from '../controllers/paymentController.js';

const router = Router();

router.post(
    '/webhook',
    express.raw({ type: 'application/json' }),
    stripeWebhook
);

// Patient creates a payment intent (triggers Stripe checkout flow)
router.post('/create-intent', protect, authorize('patient'), createPaymentIntent);

router.get('/appointment/:appointmentId', protect, authorize('patient'), getPaymentByAppointment);

router.post('/confirm-payment', protect, authorize('patient'), confirmPaymentFromFrontend);

router.post('/:id/refund', protect, authorize('admin'), refundPayment);

// Admin — list all payments with optional status filter
router.get('/admin/all', protect, authorize('admin', 'superadmin'), getAllPayments);

export default router;
import Stripe from 'stripe';
import Payment from '../models/Payment.js';
import { logger } from '../utils/logger.js';
import { publishEvent } from '../utils/eventBus.js';
import { appointmentClient } from '../config/services.js';
import { callService } from '../utils/callService.js';
import { validateCreatePaymentIntent } from '../validators/paymentValidator.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);


const confirmAppointmentWithRetry = async (appointmentId, paymentId, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await appointmentClient.patch(
                `/api/appointments/${appointmentId}/confirm`,
                { paymentId },
                {
                    headers: {
                        'x-internal-secret': process.env.INTERNAL_SECRET,
                    },
                }
            );
            logger.info(`[Webhook] Appointment confirmed on attempt ${attempt}: ${appointmentId}`);
            return true;
        } catch (err) {
            logger.warn(`[Webhook] Confirm attempt ${attempt}/${maxRetries} failed: ${err.message}`);
            if (attempt < maxRetries) {
                await new Promise((r) => setTimeout(r, attempt * 1000));
            }
        }
    }
    logger.error(`[Webhook] All ${maxRetries} confirm attempts failed for appointment ${appointmentId}. Manual review required.`);
    return false;
};

/**
 * @desc    Create a Stripe PaymentIntent for an appointment
 * @route   POST /api/payments/create-intent
 * @access  Private — patient only
 */
export const createPaymentIntent = async (req, res, next) => {
    try {
        const { appointmentId } = req.body;

        const { valid, errors } = validateCreatePaymentIntent(req.body);
        if (!valid) {
            return res.status(400).json({ success: false, errors });
        }

        const appointmentData = await callService(
            () =>
                appointmentClient.get(`/api/appointments/${appointmentId}`, {
                    headers: { Authorization: req.headers.authorization },
                }),
            'appointment-service',
            res
        );

        // callService returns null and sends its own error response if the call fails
        if (!appointmentData) return;

        const appointment = appointmentData.appointment;

        // prevent one patient from paying for another patient's appointment
        if (appointment.patientId !== req.user.id.toString()) {
            return res.status(403).json({
                success: false,
                error: 'You are not authorized to pay for this appointment.',
            });
        }

        // prevent paying for already confirmed, cancelled, or expired appointments
        if (appointment.status !== 'pending' || appointment.paymentStatus !== 'unpaid') {
            return res.status(400).json({
                success: false,
                error: `This appointment is not awaiting payment. Status: ${appointment.status}, Payment: ${appointment.paymentStatus}.`,
            });
        }

        const amount = appointment.consultationFee;
        const currency = 'usd'; 
        
        const existing = await Payment.findOne({ appointmentId });

        if (existing) {
            const intent = await stripe.paymentIntents.retrieve(existing.stripePaymentIntentId);
            if (existing.status === 'succeeded') {
                return res.status(400).json({
                    success: false,
                    error: 'Payment already completed for this appointment.',
                });
            }

            if (existing.status === 'refunded') {
                // Proceed to create new intent below
            } else {
                // For pending/failed status, reuse the existing intent
                return res.status(200).json({
                    success: true,
                    message: 'Existing payment intent returned.',
                    clientSecret: intent.client_secret,
                    paymentId: existing._id,
                    paymentIntentId: intent.id,
                });
            }
        }

        const paymentIntent = await stripe.paymentIntents.create(
            {
                amount: Math.round(amount * 100),
                currency,
                automatic_payment_methods: {
                    enabled: true,
                    allow_redirects: 'never',
                },
                metadata: {
                    appointmentId,
                    patientId: req.user.id,
                    doctorId: appointment.doctorId,
                },
            },
            {
                idempotencyKey: `payment-intent-${appointmentId}`,
            }
        );

        try {
            const payment = await Payment.create({
                appointmentId,
                patientId: req.user.id,
                doctorId: appointment.doctorId,
                stripePaymentIntentId: paymentIntent.id,
                amount,          
                currency,
                metadata: { appointmentId },
            });

            logger.info(`PaymentIntent created: ${paymentIntent.id} for appointment ${appointmentId}`);

            res.status(201).json({
                success: true,
                message: 'Payment intent created. Complete payment within 30 minutes.',
                clientSecret: paymentIntent.client_secret,
                paymentId: payment._id,
                paymentIntentId: paymentIntent.id,
                amount,
                currency,
            });
        } catch (dupeErr) {
            if (dupeErr.code === 11000) {
                logger.warn(`Duplicate payment intent ID detected: ${paymentIntent.id}, attempting to find existing...`);
                
                const existingPayment = await Payment.findOne({ 
                    stripePaymentIntentId: paymentIntent.id 
                });
                
                if (existingPayment) {
                    const existingIntent = await stripe.paymentIntents.retrieve(paymentIntent.id);
                    return res.status(200).json({
                        success: true,
                        message: 'Existing payment intent returned (recovered from duplicate).',
                        clientSecret: existingIntent.client_secret,
                        paymentId: existingPayment._id,
                        paymentIntentId: existingIntent.id,
                        amount: existingPayment.amount,  
                        currency: existingPayment.currency,  
                    });
                }
            }
            throw dupeErr;
        }
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Stripe webhook — handles payment events
 * @route   POST /api/payments/webhook
 * @access  Public — Stripe only (verified by signature)
 */
export const stripeWebhook = async (req, res, next) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    
    if (!webhookSecret || process.env.NODE_ENV === 'development') {
        try {
            event = JSON.parse(req.body.toString());
            logger.warn('[Stripe] Webhook signature verification SKIPPED - dev mode');
        } catch (error) {
            return res.status(400).json({ error: 'Invalid JSON body' });
        }
    } else {
        try {
            event = await stripe.webhooks.constructEventAsync(req.body, sig, webhookSecret);
        } catch (error) {
            logger.error(`Webhook signature verification failed: ${error.message}`);
            return res.status(400).json({ error: `Webhook Error: ${error.message}` });
        }
    }

    switch (event.type) {
        case 'payment_intent.succeeded':
            await handlePaymentSuccess(event.data.object);
            break;

        case 'payment_intent.payment_failed':
            await handlePaymentFailure(event.data.object);
            break;

        default:
            logger.info(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
};

//  Private: handle successful payment 
const handlePaymentSuccess = async (intent) => {
    try {
        const payment = await Payment.findOne({ stripePaymentIntentId: intent.id });

        if (!payment) {
            logger.error(`[Webhook] Payment record not found for intent: ${intent.id}`);
            return;
        }

        if (payment.status === 'succeeded') {
            logger.info(`[Webhook] Already processed: ${intent.id} — skipping`);
            return;
        }

        // Update payment record — status + clear TTL so record is never auto-deleted
        payment.status = 'succeeded';
        payment.paidAt = new Date();
        payment.expiresAt = null;
        await payment.save();

       
        const { appointmentId, patientId } = payment;

        await confirmAppointmentWithRetry(appointmentId, payment._id.toString());

        await publishEvent('payment.completed', {
            paymentId: payment._id,
            appointmentId,
            patientId,
            doctorId: payment.doctorId,
            amount: payment.amount,
            currency: payment.currency,
            paidAt: payment.paidAt,
        });

        logger.success(`[Webhook] Payment succeeded: ${intent.id} — appointment: ${appointmentId}`);
    } catch (err) {
        logger.error(`[Webhook] handlePaymentSuccess failed: ${err.message}`);
    }
};

//  Private: handle failed payment 
const handlePaymentFailure = async (intent) => {
    try {
        await Payment.findOneAndUpdate(
            { stripePaymentIntentId: intent.id },
            { status: 'failed' }
        );

        const payment = await Payment.findOne({ stripePaymentIntentId: intent.id });

        await publishEvent('payment.failed', {
            appointmentId: payment?.appointmentId,
            patientId: payment?.patientId,
            reason: intent.last_payment_error?.message || 'Payment failed',
        });

        logger.warn(`[Webhook] Payment failed: ${intent.id}`);
    } catch (err) {
        logger.error(`[Webhook] handlePaymentFailure failed: ${err.message}`);
    }
};

/**
 * @desc    Issue a refund for a payment
 * @route   POST /api/payments/:id/refund
 * @access  Private — admin only
 */
export const refundPayment = async (req, res, next) => {
    try {
        const payment = await Payment.findById(req.params.id);

        if (!payment) {
            return res.status(404).json({ success: false, error: 'Payment not found.' });
        }

        if (payment.status !== 'succeeded') {
            return res.status(400).json({
                success: false,
                error: `Cannot refund a payment with status: ${payment.status}.`,
            });
        }

        const refund = await stripe.refunds.create({
            payment_intent: payment.stripePaymentIntentId,
        });

        payment.status = 'refunded';
        payment.refundId = refund.id;
        payment.refundedAt = new Date();
        await payment.save();

        const appointment = await Appointment.findById(payment.appointmentId);

        await publishEvent('payment.refunded', {
            paymentId: payment._id,
            appointmentId: payment.appointmentId,
            patientId: payment.patientId,
            doctorId: payment.doctorId,
            amount: payment.amount,
            refundedAt: payment.refundedAt,
            patientEmail: appointment?.patientEmail || null,
            patientFullName: appointment?.patientFullName || null,
        });

        logger.success(`Refund issued: ${refund.id} for payment ${payment._id}`);

        res.status(200).json({
            success: true,
            message: 'Refund issued successfully.',
            paymentId: payment._id,
            refundId: payment.refundId,
            refundedAt: payment.refundedAt,
            status: payment.status,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Get payment details by appointment ID
 * @route   GET /api/payments/appointment/:appointmentId
 * @access  Private — patient only
 */
export const getPaymentByAppointment = async (req, res, next) => {
    try {
        const payment = await Payment.findOne({
            appointmentId: req.params.appointmentId,
            patientId: req.user.id,
        });

        if (!payment) {
            return res.status(404).json({ success: false, error: 'Payment not found.' });
        }

        const response = {
            success: true,
            paymentId: payment._id,
            status: payment.status,
            amount: payment.amount,
            currency: payment.currency,
        };

        if (payment.status === 'pending') {
            const intent = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);
            response.clientSecret = intent.client_secret;
        }

        res.status(200).json(response);
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Frontend calls this after Stripe.js confirms payment in browser
 * @route   POST /api/payments/confirm-payment
 * @access  Private — patient only
 */
export const confirmPaymentFromFrontend = async (req, res, next) => {
    try {
        const { paymentIntentId } = req.body;

        if (!paymentIntentId) {
            return res.status(400).json({ success: false, error: 'paymentIntentId is required.' });
        }

        // Verify with Stripe directly — don't trust the frontend alone
        const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (intent.status !== 'succeeded') {
            return res.status(400).json({
                success: false,
                error: `Payment not completed. Stripe status: ${intent.status}`,
            });
        }

        // Find payment record
        const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntentId });

        if (!payment) {
            return res.status(404).json({ success: false, error: 'Payment record not found.' });
        }

        // Verify patient owns the payment
        if (payment.patientId !== req.user.id.toString()) {
            return res.status(403).json({ success: false, error: 'Unauthorized.' });
        }

        // Idempotency guard
        if (payment.status === 'succeeded') {
            res.status(200).json({
            success: true,
            message: 'Already confirmed.',
            paymentId: payment._id,
            status: payment.status,
        });
        }

        // Update payment
        payment.status = 'succeeded';
        payment.paidAt = new Date();
        payment.expiresAt = null;
        await payment.save();

        // Confirm appointment
        await confirmAppointmentWithRetry(payment.appointmentId, payment._id.toString());

        // Publish event
        await publishEvent('payment.completed', {
            paymentId: payment._id,
            appointmentId: payment.appointmentId,
            patientId: payment.patientId,
            doctorId: payment.doctorId,
            amount: payment.amount,
            currency: payment.currency,
            paidAt: payment.paidAt,
        });

        res.status(200).json({
            success: true,
            message: 'Payment confirmed successfully.',
            payment,
        });
    } catch (err) {
        next(err);
    }
};

export const getAllPayments = async (req, res, next) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        const filter = {};
        if (status) filter.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [payments, total] = await Promise.all([
            Payment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
            Payment.countDocuments(filter),
        ]);

        // Aggregate stats across ALL payments (not just current page)
        const [revenueAgg] = await Payment.aggregate([
            {
                $group: {
                    _id: null,
                    totalRevenue:   { $sum: { $cond: [{ $eq: ['$status', 'succeeded'] }, '$amount', 0] } },
                    refundedAmount: { $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, '$amount', 0] } },
                    pendingAmount:  { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] } },
                    successfulPayments: { $sum: { $cond: [{ $eq: ['$status', 'succeeded'] }, 1, 0] } },
                    failedCount:    { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
                    totalTransactions: { $sum: 1 },
                },
            },
        ]);

        res.status(200).json({
            success: true,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            payments,
            stats: revenueAgg || {
                totalRevenue: 0, refundedAmount: 0, pendingAmount: 0,
                successfulPayments: 0, failedCount: 0, totalTransactions: 0,
            },
        });
    } catch (err) {
        next(err);
    }
};

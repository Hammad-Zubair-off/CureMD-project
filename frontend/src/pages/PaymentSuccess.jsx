import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import paymentService from '../services/paymentService';

/**
 * Landing page for Stripe's `return_url` after a redirect-based confirmation
 * (e.g. 3-D Secure). Stripe appends `payment_intent`, `redirect_status`, etc.
 * to the URL. For the common no-redirect card flow the user never reaches here
 * — StripePaymentElement finalizes inline.
 */
export default function PaymentSuccess() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const [state, setState] = useState('working'); // working | success | failed
    const [message, setMessage] = useState('');
    const ran = useRef(false);

    const paymentIntent = params.get('payment_intent');
    const redirectStatus = params.get('redirect_status');

    useEffect(() => {
        if (ran.current) return;
        ran.current = true;

        const finalize = async () => {
            if (redirectStatus && redirectStatus !== 'succeeded') {
                setState('failed');
                setMessage('The payment was not completed. You can try again from your appointments.');
                return;
            }
            if (!paymentIntent) {
                setState('failed');
                setMessage('Missing payment reference.');
                return;
            }
            try {
                await paymentService.confirmPayment(paymentIntent);
                setState('success');
                setTimeout(() => navigate('/patient/my-appointments'), 3000);
            } catch (err) {
                setState('failed');
                setMessage(err?.error || err?.message || 'We could not confirm the payment. Please check your appointments.');
            }
        };
        finalize();
    }, [paymentIntent, redirectStatus, navigate]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6 text-center">
            {state === 'working' && (
                <>
                    <Loader2 className="w-10 h-10 text-slate-400 animate-spin mb-6" />
                    <h1 className="text-lg font-bold text-slate-700">Confirming your payment…</h1>
                </>
            )}
            {state === 'success' && (
                <>
                    <CheckCircle className="w-12 h-12 text-emerald-500 mb-6" />
                    <h1 className="text-xl font-bold text-slate-900">Payment confirmed</h1>
                    <p className="mt-2 text-sm text-slate-500">Redirecting you to your appointments…</p>
                    <Link to="/patient/my-appointments" className="mt-8 inline-flex items-center rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
                        Go now
                    </Link>
                </>
            )}
            {state === 'failed' && (
                <>
                    <AlertCircle className="w-12 h-12 text-red-500 mb-6" />
                    <h1 className="text-xl font-bold text-slate-900">Payment not completed</h1>
                    <p className="mt-2 text-sm text-slate-500 max-w-sm">{message}</p>
                    <Link to="/patient/my-appointments" className="mt-8 inline-flex items-center rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
                        Back to appointments
                    </Link>
                </>
            )}
        </div>
    );
}

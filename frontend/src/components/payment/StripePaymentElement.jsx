import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Lock, AlertCircle } from 'lucide-react';
import paymentService from '../../services/paymentService';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const PaymentForm = ({ paymentIntentId, onSuccess, onError }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!stripe || !elements) return;

        setLoading(true);
        setErrorMessage('');

        try {
            const { error, paymentIntent: confirmedIntent } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: `${window.location.origin}/payment-success`,
                },
                redirect: 'if_required',
            });

            if (error) {
                setErrorMessage(error.message);
                onError?.(error.message);
            } else if (confirmedIntent.status === 'succeeded') {
                console.log('Payment succeeded, confirming with backend...');
                try {
                    await paymentService.confirmPayment(confirmedIntent?.id || paymentIntentId);
                    onSuccess?.();
                } catch (confirmError) {
                    const msg = confirmError?.error || confirmError?.message || 'Confirmation failed';
                    setErrorMessage(msg);
                    onError?.(msg);
                }
            }
        } catch (err) {
            setErrorMessage(err.message);
            onError?.(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mt-8">
            <PaymentElement />
            
            {errorMessage && (
                <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-600 flex items-start space-x-3 rounded-none">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <span className="text-red-700 text-sm font-medium">{errorMessage}</span>
                </div>
            )}
            
            <button
                type="submit"
                disabled={!stripe || loading}
                className="mt-8 w-full bg-blue-600 text-white py-4 px-4 rounded-xl font-semibold uppercase tracking-wider transition-colors duration-200 flex items-center justify-center space-x-2 disabled:bg-slate-300 disabled:text-slate-500 hover:bg-blue-800"
            >
                {loading ? (
                    <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        <span>Processing...</span>
                    </>
                ) : (
                    <>
                        <Lock className="w-4 h-4" />
                        <span>Confirm Payment</span>
                    </>
                )}
            </button>
        </form>
    );
};

export const StripePaymentWrapper = ({ clientSecret, paymentIntentId, onSuccess, onError }) => {
    if (!clientSecret || !paymentIntentId) {
        return (
            <div className="p-4 bg-red-50 text-red-600 rounded-none border-l-4 border-red-600 flex items-center space-x-2">
                <AlertCircle className="w-5 h-5" />
                <span>Payment details not available. Please refresh the page.</span>
            </div>
        );
    }

    // Modern, sharp-edged Stripe appearance
    const options = {
        clientSecret,
        appearance: {
            theme: 'stripe',
            variables: {
            colorPrimary: '#2563eb',
            colorBackground: '#ffffff',
            colorText: '#0f172a',
            colorDanger: '#ef4444',
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            spacingUnit: '4px',
            borderRadius: '10px',

            // Add these for text sizing
            fontSizeBase: '15px',      // main text size
            fontSizeSm: '13px',        // smaller helper text
            fontSizeLg: '18px',        // larger text (if used by theme)
            },
            rules: {
            '.Input': {
                borderColor: '#cbd5e1',
                boxShadow: 'none',
                fontSize: '16px',        // input text
            },
            '.Label': {
                fontSize: '14px',        // field labels
            },
            '.Error': {
                fontSize: '13px',        // error text
            },
            '.Input:focus': {
                boxShadow: 'none',
                borderColor: '#2563eb',
            },
            },
            labels: 'floating',
        },
        };

    return (
        <Elements stripe={stripePromise} options={options}>
            <PaymentForm
                paymentIntentId={paymentIntentId}
                onSuccess={onSuccess}
                onError={onError}
            />
        </Elements>
    );
};
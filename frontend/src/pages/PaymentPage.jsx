import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import paymentService from '../services/paymentService';
import { StripePaymentWrapper } from '../components/payment/StripePaymentElement';
import PaymentSummary from '../components/payment/PaymentSummary';

const PaymentPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();

    const [appointment, setAppointment] = useState(null);
    const [paymentIntent, setPaymentIntent] = useState(null);
    const [paymentStatus, setPaymentStatus] = useState('idle');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        let aborted = false;

        const initializePayment = async () => {
            try {
                setLoading(true);

                const appointmentId = searchParams.get('appointmentId');

                if (!appointmentId) {
                    if (!aborted) {
                        setError('Appointment ID is required. Please book an appointment first.');
                        setPaymentStatus('failed');
                    }
                    return;
                }

                const appointmentResponse = await api.get(`/appointments/${appointmentId}`);

                if (aborted) return;

                setAppointment(appointmentResponse.data.appointment);

                const intent = await paymentService.createPaymentIntent(appointmentId);

                if (aborted) return;

                setPaymentIntent(intent);
                setPaymentStatus('idle');
            } catch (err) {
                if (aborted) return;
                setError(err.response?.data?.error || 'Failed to initialize payment');
                setPaymentStatus('failed');
            } finally {
                if (!aborted) setLoading(false);
            }
        };

        initializePayment();

        return () => {
            aborted = true;
        };
    }, [searchParams]); 

    useEffect(() => {
        let timer;
        if (paymentStatus === 'success') {
            timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                         navigate('/patient/my-appointments');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [paymentStatus, navigate]);

    const handlePaymentSuccess = () => {
        setPaymentStatus('success');
    };

    const handlePaymentError = (error) => {
        setError(error);
        setPaymentStatus('failed');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 animate-spin rounded-none"></div>
                    <p className="mt-6 text-slate-600 font-bold uppercase tracking-wider">Loading Gateway</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white flex flex-col lg:flex-row font-sans">
            
            {/* Success Modal Overlay */}
            {paymentStatus === 'success' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm transition-opacity">
                    <div className="bg-white p-8 max-w-md w-full shadow-2xl rounded-none text-center transform scale-100 transition-transform duration-300">
                        <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
                        <h3 className="text-2xl font-bold text-slate-900 mb-4">Payment Successful!</h3>
                        <p className="text-slate-600 text-lg mb-8">Your appointment is officially confirmed.</p>
                        <div className="bg-slate-100 p-2.5 rounded-none border border-slate-200">
                            <p className="text-lg font-bold text-slate-500 uppercase tracking-widest">You will be redirect to you profile</p>
                            <p className="text-[12px] font-black text-blue-600 mt-1">In {countdown}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Left 50% - Payment Details Form */}
            <div className="w-full lg:w-1/2 flex flex-col p-8 lg:p-14 xl:p-16 overflow-y-auto">
                <div className="max-w-xl mx-auto w-full">
                    
                    <div className="mb-12">
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4">
                            Checkout
                        </h1>
                        <p className="text-slate-500 font-medium text-lg">Enter your payment details below.</p>
                        
                    </div>

                    {error && paymentStatus === 'failed' && (
                        <div className="mb-8 p-5 bg-red-50 border-l-4 border-red-600 rounded-none">
                            <h3 className="font-bold text-red-900 mb-1 flex items-center">
                                <AlertCircle className="w-5 h-5 mr-2 inline" /> Error
                            </h3>
                            <p className="text-red-700">{error}</p>
                        </div>
                    )}

                    <div>
                        <div className="flex items-center space-x-3 mb-6">
                            <CreditCard className="w-6 h-6 text-slate-400" />
                            <h2 className="text-xl font-bold text-slate-900 uppercase tracking-wider">Payment Information</h2>
                        </div>

                        {paymentIntent?.clientSecret && paymentIntent?.paymentIntentId ? (
                            <StripePaymentWrapper
                                clientSecret={paymentIntent.clientSecret}
                                paymentIntentId={paymentIntent.paymentIntentId}
                                onSuccess={handlePaymentSuccess}
                                onError={handlePaymentError}
                            />
                        ) : (
                            <div className="p-8 bg-slate-50 border border-slate-200 text-slate-500 text-center font-medium rounded-none">
                                Preparing secure payment gateway...
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="w-full lg:w-1/2 min-h-[50vh] lg:min-h-screen">
                {appointment && <PaymentSummary appointment={appointment} />}
            </div>
            
        </div>
    );
};

export default PaymentPage;